using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using System;

namespace Amvia_Datastore_V_1_0
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                });

            // Add HttpClient
            builder.Services.AddHttpClient();

            // Configure CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp",
                    builder =>
                    {
                        builder
                            .WithOrigins(
                                "http://localhost:5173", // Vite default
                                "http://localhost:3000"  // Alternative port
                            )
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .WithExposedHeaders("*");
                    });
            });

            // Add Swagger/OpenAPI support
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Amvia Technology Review API",
                    Version = "v1",
                    Description = "API for the Amvia Technology Review Tool",
                    Contact = new OpenApiContact
                    {
                        Name = "Amvia Support",
                        Email = "support@amvia.com",
                        Url = new Uri("https://www.amvia.com/support")
                    }
                });
            });

            // Configure caching
            builder.Services.AddMemoryCache();

            // Add response compression
            builder.Services.AddResponseCompression(options =>
            {
                options.EnableForHttps = true;
            });

            // Add health checks
            builder.Services.AddHealthChecks();

            var app = builder.Build();

            // Configure the HTTP request pipeline
            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Amvia Technology Review API V1");
                    c.RoutePrefix = "swagger";
                });
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            // Enable response compression
            app.UseResponseCompression();

            // Enable HTTPS redirection
            app.UseHttpsRedirection();

            // Enable static files
            app.UseStaticFiles();

            // Enable routing
            app.UseRouting();

            // Enable CORS - must be between UseRouting and UseEndpoints
            app.UseCors("AllowReactApp");

            // Enable authorization
            app.UseAuthorization();

            // Map controllers
            app.MapControllers();

            // Map health checks
            app.MapHealthChecks("/health");

            // Add global error handling
            app.Use(async (context, next) =>
            {
                try
                {
                    await next();
                }
                catch (Exception ex)
                {
                    context.Response.StatusCode = 500;
                    if (app.Environment.IsDevelopment())
                    {
                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "An unexpected error occurred",
                            message = ex.Message,
                            stackTrace = ex.StackTrace
                        });
                    }
                    else
                    {
                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "An unexpected error occurred"
                        });
                    }
                }
            });

            // Add request logging in development
            if (app.Environment.IsDevelopment())
            {
                app.Use(async (context, next) =>
                {
                    Console.WriteLine($"Request: {context.Request.Method} {context.Request.Path}");
                    await next();
                    Console.WriteLine($"Response: {context.Response.StatusCode}");
                });
            }

            app.Run();
        }
    }
}
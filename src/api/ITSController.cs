using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations; // For validation
[ApiController]
[Route("api/[controller]")]
public class ITSController : ControllerBase
{
    private readonly IHttpClientFactory _clientFactory;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ITSController> _logger;

    private const string BaseUrl = "https://api.itstechnologygroup.com";

    public ITSController(IHttpClientFactory clientFactory, IConfiguration configuration, IMemoryCache cache, ILogger<ITSController> logger)
    {
        _clientFactory = clientFactory;
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
    }

    [HttpPost("availability")]
    public async Task<IActionResult> CheckAvailability([FromBody] AvailabilityRequest request)
    {
        try
        {
            var client = _clientFactory.CreateClient();

            // Get token with caching
            var token = await GetAccessTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.PostAsync(
                $"{BaseUrl}/api/v1/availability/search/create",
                new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json")
            );

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("ITS API Error: {StatusCode} - {Content}", response.StatusCode, errorContent);
                return StatusCode((int)response.StatusCode, errorContent);
            }

            var result = await JsonSerializer.DeserializeAsync<AvailabilityResult>(
                await response.Content.ReadAsStreamAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking availability");
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    private async Task<string> GetAccessTokenAsync(HttpClient client)
    {
        if (_cache.TryGetValue("ITS_AccessToken", out string token))
        {
            return token;
        }

        var response = await Authenticate(client);
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception("Authentication failed.");
        }

        token = await response.Content.ReadAsStringAsync();
        _cache.Set("ITS_AccessToken", token, TimeSpan.FromMinutes(55)); // Adjust based on token validity
        return token;
    }

    private async Task<HttpResponseMessage> Authenticate(HttpClient client)
    {
        var credentials = new
        {
            username = _configuration["ITS:Username"],
            password = _configuration["ITS:Password"]
        };

        return await client.PostAsync(
            $"{BaseUrl}/login",
            new StringContent(JsonSerializer.Serialize(credentials), Encoding.UTF8, "application/json")
        );
    }
}

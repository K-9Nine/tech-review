using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace TechReview.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AddressController : ControllerBase
{
    private readonly IHttpClientFactory _clientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AddressController> _logger;
    private const string BaseUrl = "https://api.getaddress.io";

    public AddressController(
        IHttpClientFactory clientFactory,
        IConfiguration configuration,
        ILogger<AddressController> logger)
    {
        _clientFactory = clientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("autocomplete/{term}")]
    public async Task<IActionResult> AutocompleteAddress(string term)
    {
        try
        {
            var apiKey = _configuration["AddressApi:Key"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return BadRequest(new { error = "API key is not configured" });
            }

            term = Uri.EscapeDataString(term.Trim());
            var url = $"{BaseUrl}/autocomplete/{term}?api-key={apiKey}";
            
            var client = _clientFactory.CreateClient();
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Address lookup failed",
                    details = content,
                    statusCode = (int)response.StatusCode
                });
            }

            // Parse and format the response
            using JsonDocument doc = JsonDocument.Parse(content);
            var suggestions = doc.RootElement
                .GetProperty("suggestions")
                .EnumerateArray()
                .Select(s => new
                {
                    id = s.GetProperty("id").GetString(),
                    address = s.GetProperty("address").GetString(),
                    url = s.GetProperty("url").GetString()
                })
                .ToList();

            return Ok(new { suggestions });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Autocomplete error: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("get/{id}")]
    public async Task<IActionResult> GetAddress(string id)
    {
        try
        {
            var apiKey = _configuration["AddressApi:Key"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return BadRequest(new { error = "API key is not configured" });
            }

            var url = $"{BaseUrl}/get/{id}?api-key={apiKey}";
            
            var client = _clientFactory.CreateClient();
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Address lookup failed",
                    details = content,
                    statusCode = (int)response.StatusCode
                });
            }

            return Ok(content);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Get address error: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // Helper endpoint to format an address nicely
    [HttpGet("format")]
    public IActionResult FormatAddress([FromQuery] string building, [FromQuery] string street, 
        [FromQuery] string locality, [FromQuery] string town, [FromQuery] string county, [FromQuery] string postcode)
    {
        var addressParts = new[]
        {
            building?.Trim(),
            street?.Trim(),
            locality?.Trim(),
            town?.Trim(),
            county?.Trim(),
            postcode?.Trim().ToUpper()
        };

        var formattedAddress = string.Join(", ", addressParts.Where(part => !string.IsNullOrWhiteSpace(part)));
        var singleLineAddress = formattedAddress;

        var multiLineAddress = string.Join("\n", addressParts.Where(part => !string.IsNullOrWhiteSpace(part)));

        return Ok(new
        {
            formatted = formattedAddress,
            singleLine = singleLineAddress,
            multiLine = multiLineAddress,
            parts = new
            {
                building,
                street,
                locality,
                town,
                county,
                postcode
            }
        });
    }
}
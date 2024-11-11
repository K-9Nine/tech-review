using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace Amvia_Datastore_V_1_0.Controllers
{
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

        [HttpGet("lookup/{postcode}")]
        public async Task<IActionResult> LookupAddress(string postcode)
        {
            try
            {
                var client = _clientFactory.CreateClient();
                var apiKey = _configuration["AddressApi:Key"];

                if (string.IsNullOrEmpty(apiKey))
                {
                    return StatusCode(500, new { error = "Address API key not configured" });
                }

                var response = await client.GetAsync(
                    $"{BaseUrl}/find/{Uri.EscapeDataString(postcode)}?api-key={apiKey}"
                );

                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Address lookup failed: {content}");
                    return StatusCode((int)response.StatusCode, new { error = "Address lookup failed" });
                }

                return Ok(JsonSerializer.Deserialize<JsonElement>(content));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error looking up address: {ex.Message}");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}
[ApiController]
[Route("api/[controller]")]
public class AddressController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private const string API_URL = "https://api.getaddress.io/find/";

    public AddressController(IConfiguration configuration, HttpClient httpClient)
    {
        _configuration = configuration;
        _httpClient = httpClient;
    }

    [HttpGet("lookup/{postcode}")]
    public async Task<IActionResult> LookupAddress(string postcode)
    {
        try
        {
            var apiKey = _configuration["GetAddress:ApiKey"];
            var encodedPostcode = Uri.EscapeDataString(postcode);
            var url = $"{API_URL}{encodedPostcode}?api-key={apiKey}";

            var response = await _httpClient.GetAsync(url);
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Ok(content);
            }
            
            return BadRequest("Failed to fetch address data");
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Internal server error");
        }
    }
}
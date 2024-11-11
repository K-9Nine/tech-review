// Controllers/PricingController.cs

[ApiController]
[Route("api/[controller]")]
public class PricingController : ControllerBase
{
    private readonly PricingDbContext _context;

    public PricingController(PricingDbContext context)
    {
        _context = context;
    }

    [HttpGet("broadband")]
    public async Task<ActionResult<IEnumerable<BroadbandPrice>>> GetBroadbandPrices(
        [FromQuery] string technology = null,
        [FromQuery] string speed = null)
    {
        var query = _context.BroadbandPrices
            .Where(p => p.IsActive && (!p.ValidTo.HasValue || p.ValidTo > DateTime.UtcNow));

        if (!string.IsNullOrEmpty(technology))
            query = query.Where(p => p.Technology == technology);

        if (!string.IsNullOrEmpty(speed))
            query = query.Where(p => p.Speed == speed);

        return await query.ToListAsync();
    }

    [HttpGet("mobile")]
    public async Task<ActionResult<IEnumerable<MobilePrice>>> GetMobilePrices(
        [FromQuery] string dataAllowance = null,
        [FromQuery] string type = null,
        [FromQuery] int? connections = null)
    {
        var query = _context.MobilePrices
            .Where(p => p.IsActive && (!p.ValidTo.HasValue || p.ValidTo > DateTime.UtcNow));

        if (!string.IsNullOrEmpty(dataAllowance))
            query = query.Where(p => p.DataAllowance == dataAllowance);

        if (!string.IsNullOrEmpty(type))
            query = query.Where(p => p.Type == type);

        if (connections.HasValue)
            query = query.Where(p => p.MinConnections <= connections && 
                (!p.MaxConnections.HasValue || p.MaxConnections >= connections));

        return await query.ToListAsync();
    }

    [HttpGet("phonesystem")]
    public async Task<ActionResult<IEnumerable<PhoneSystemPrice>>> GetPhoneSystemPrices(
        [FromQuery] string type = null,
        [FromQuery] int? users = null)
    {
        var query = _context.PhoneSystemPrices
            .Where(p => p.IsActive && (!p.ValidTo.HasValue || p.ValidTo > DateTime.UtcNow));

        if (!string.IsNullOrEmpty(type))
            query = query.Where(p => p.Type == type);

        if (users.HasValue)
            query = query.Where(p => p.MinUsers <= users && 
                (!p.MaxUsers.HasValue || p.MaxUsers >= users));

        return await query.ToListAsync();
    }

    // Admin endpoints for managing prices

    [HttpPost("broadband")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BroadbandPrice>> AddBroadbandPrice(BroadbandPrice price)
    {
        _context.BroadbandPrices.Add(price);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetBroadbandPrices), new { id = price.Id }, price);
    }

    [HttpPost("mobile")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MobilePrice>> AddMobilePrice(MobilePrice price)
    {
        _context.MobilePrices.Add(price);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMobilePrices), new { id = price.Id }, price);
    }

    [HttpPost("phonesystem")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PhoneSystemPrice>> AddPhoneSystemPrice(PhoneSystemPrice price)
    {
        _context.PhoneSystemPrices.Add(price);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPhoneSystemPrices), new { id = price.Id }, price);
    }

    // Add bulk upload endpoint for easy price management
    [HttpPost("bulk-upload")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> BulkUploadPrices(BulkPriceUploadDto uploadDto)
    {
        try
        {
            if (uploadDto.BroadbandPrices != null)
                _context.BroadbandPrices.AddRange(uploadDto.BroadbandPrices);
            
            if (uploadDto.MobilePrices != null)
                _context.MobilePrices.AddRange(uploadDto.MobilePrices);
            
            if (uploadDto.PhoneSystemPrices != null)
                _context.PhoneSystemPrices.AddRange(uploadDto.PhoneSystemPrices);

            await _context.SaveChangesAsync();
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

public class BulkPriceUploadDto
{
    public List<BroadbandPrice> BroadbandPrices { get; set; }
    public List<MobilePrice> MobilePrices { get; set; }
    public List<PhoneSystemPrice> PhoneSystemPrices { get; set; }
}
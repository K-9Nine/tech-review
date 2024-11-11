// models/PricingModels.cs

public class BroadbandPrice
{
    public int Id { get; set; }
public string Technology { get; set; }  // FTTC, FTTP, etc.
public string Speed { get; set; }       // "80/20", "330/50", etc.
public decimal Price { get; set; }
public int Term { get; set; }           // Contract length in months
public string Provider { get; set; }    // Zen, BT, etc.
public bool IsActive { get; set; }
public DateTime ValidFrom { get; set; }
public DateTime? ValidTo { get; set; }
public string Notes { get; set; }
}

public class MobilePrice
{
    public int Id { get; set; }
public string Provider { get; set; }    // EE, Vodafone, etc.
public string Type { get; set; }        // Handset, SIM Only, etc.
public string DataAllowance { get; set; }// "1GB", "Unlimited", etc.
public int MinConnections { get; set; } // Minimum number of connections
public int? MaxConnections { get; set; }// Maximum number of connections
public decimal Price { get; set; }      // Price per connection
public int Term { get; set; }           // Contract length in months
public string Handset { get; set; }     // For handset plans
public bool IsSharedData { get; set; }  // For shared data plans
public bool IsActive { get; set; }
public DateTime ValidFrom { get; set; }
public DateTime? ValidTo { get; set; }
public string Notes { get; set; }
}

public class PhoneSystemPrice
{
    public int Id { get; set; }
public string Provider { get; set; }    // RingCentral, 8x8, etc.
public string Type { get; set; }        // Cloud, On-Premise, etc.
public int MinUsers { get; set; }       // Minimum number of users
public int? MaxUsers { get; set; }      // Maximum number of users
public decimal Price { get; set; }      // Price per user
public int Term { get; set; }           // Contract length in months
public string Handset { get; set; }     // Handset model
public List<string> Features { get; set; } // List of included features
public bool IsActive { get; set; }
public DateTime ValidFrom { get; set; }
public DateTime? ValidTo { get; set; }
public string Notes { get; set; }
}

// DbContext
public class PricingDbContext : DbContext
{
    public DbSet<BroadbandPrice> BroadbandPrices { get; set; }
    public DbSet<MobilePrice> MobilePrices { get; set; }
    public DbSet<PhoneSystemPrice> PhoneSystemPrices { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PhoneSystemPrice>()
            .Property(e => e.Features)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
        v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null));
    }
}
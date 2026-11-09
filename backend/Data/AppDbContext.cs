
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Models;

namespace SchoolAdmission.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options)
{
    public DbSet<AdmissionClass> Classes => Set<AdmissionClass>();
    public DbSet<AdmissionHold> Holds => Set<AdmissionHold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdmissionClass>()
            .ToTable("classes");

        modelBuilder.Entity<AdmissionHold>()
            .ToTable("holds");

        modelBuilder.Entity<AdmissionHold>()
            .HasOne(h => h.AdmissionClass)
            .WithMany(c => c.Holds)
            .HasForeignKey(h => h.ClassId);

        // Prevent duplicate active/confirmed applications
        modelBuilder.Entity<AdmissionHold>()
            .HasIndex(h => new { h.ClassId, h.StudentId })
            .IsUnique()
            .HasFilter("\"Status\" IN ('HELD', 'CONFIRMED')");
    }
}

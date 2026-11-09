namespace SchoolAdmission.Api.Models;

public class AdmissionHold
{
    public string Id { get; set; } = $"h_{Guid.NewGuid():N}";
    public string ClassId { get; set; } = "";
    public string StudentId { get; set; } = "";

    public string Status { get; set; } = "HELD";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AdmissionClass AdmissionClass { get; set; } = null!;
}
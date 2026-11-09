namespace SchoolAdmission.Api.Models;

public class AdmissionClass
{
    public string Id { get; set; } = $"c_{Guid.NewGuid():N}";
    public string Name { get; set; } = "";
    public int TotalSeats { get; set; }

    public List<AdmissionHold> Holds { get; set; } = [];
}
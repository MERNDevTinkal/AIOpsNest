using BCrypt.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AuthService.Models;

namespace AuthService.Services;

public class AuthService {
    private readonly UsersService _users;
    private readonly string _jwtSecret;
    public AuthService(UsersService users, IConfiguration config) {
        _users = users;
        _jwtSecret = config.GetValue<string>("Jwt:Secret") ?? "change-me";
    }

    public async Task<User> RegisterAsync(string email, string password) {
        var existing = await _users.FindByEmailAsync(email);
        if (existing != null) throw new Exception("Email already registered");
        var hash = BCrypt.Net.BCrypt.HashPassword(password);
        var token = Guid.NewGuid().ToString();
        var user = new User { Email = email, PasswordHash = hash, EmailVerificationToken = token, IsEmailVerified = false };
        return await _users.CreateAsync(user);
    }

    public async Task<string> LoginAsync(string email, string password) {
        var user = await _users.FindByEmailAsync(email);
        if (user == null) throw new Exception("Invalid credentials");
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) throw new Exception("Invalid credentials");
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor {
            Subject = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, user.Id ?? string.Empty), new Claim(ClaimTypes.Email, user.Email) }),
            Expires = DateTime.UtcNow.AddMinutes(60),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public async Task VerifyEmailAsync(string token) {
        var user = (await _users.FindByEmailAsync("")).FirstOrDefault(); // placeholder - real implementation should query by token
        // keep simple for scaffold
    }
}

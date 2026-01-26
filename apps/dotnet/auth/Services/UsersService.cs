using MongoDB.Driver;
using AuthService.Models;

namespace AuthService.Services;

public class UsersService {
    private readonly IMongoCollection<User> _collection;
    public UsersService(IMongoClient client) {
        var db = client.GetDatabase("auth_db");
        _collection = db.GetCollection<User>("users");
    }

    public async Task<User?> FindByEmailAsync(string email) {
        return await _collection.Find(u => u.Email == email).FirstOrDefaultAsync();
    }

    public async Task<User> CreateAsync(User user) {
        await _collection.InsertOneAsync(user);
        return user;
    }

    public async Task<User?> FindByIdAsync(string id) {
        return await _collection.Find(u => u.Id == id).FirstOrDefaultAsync();
    }

    public async Task UpdateAsync(User user) {
        await _collection.ReplaceOneAsync(u => u.Id == user.Id, user);
    }
}

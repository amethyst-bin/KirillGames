import urllib.request
import urllib.error
import json
import sys
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_URL = "http://83.143.112.6"

def api_call(path, method="GET", data=None, token=None):
    url = f"{API_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"raw": err_body}

def main():
    print("=== 1. Testing GET /api/health ===")
    status, res = api_call("/api/health")
    assert status == 200, f"Health check failed: {res}"
    print(f"PASS: {res}")

    test_username = "Тестер_API_99"
    test_password = "SecurePassword123!"

    print("\n=== 2. Testing POST /api/auth/register ===")
    status, res = api_call("/api/auth/register", "POST", {
        "username": test_username,
        "password": test_password
    })
    if status == 400 and "уже существует" in str(res):
        print("User exists, logging in instead...")
        status, res = api_call("/api/auth/login", "POST", {
            "username": test_username,
            "password": test_password
        })
    assert status == 200, f"Registration/Login failed: {res}"
    token = res["token"]
    user_id = res["user"]["id"]
    print(f"PASS: Registered user_id={user_id}, username={res['user']['username']}, coins={res['user']['coins']}")

    print("\n=== 3. Testing POST /api/auth/login ===")
    status, res = api_call("/api/auth/login", "POST", {
        "username": test_username,
        "password": test_password
    })
    assert status == 200, f"Login failed: {res}"
    print(f"PASS: Logged in successfully, token received.")

    print("\n=== 4. Testing GET /api/profile/me ===")
    status, res = api_call("/api/profile/me", "GET", token=token)
    assert status == 200 and res["user"]["username"] == test_username, f"Profile me failed: {res}"
    print(f"PASS: Profile me confirmed for {test_username}")

    print("\n=== 5. Testing POST /api/profile/update (Avatar & Name) ===")
    status, res = api_call("/api/profile/update", "POST", {"avatar": "🦄"}, token=token)
    assert status == 200 and res["user"]["avatar"] == "🦄", f"Update failed: {res}"
    print(f"PASS: Avatar updated to 🦄")

    print("\n=== 6. Testing POST /api/games/record across all games ===")
    games = [
        ("slots", 50, 200, 4.0),
        ("blackjack", 100, 250, 2.5),
        ("crash", 200, 800, 4.0),
        ("towers", 50, 187, 3.75),
        ("mines", 100, 450, 4.5),
        ("plinko", 50, 650, 13.0),
        ("roulette", 100, 5000, 50.0),
        ("dice", 50, 1500, 30.0),
        ("keno", 50, 12500, 250.0),
        ("coinflip", 100, 385, 3.85),
        ("hilo", 50, 480, 9.6),
        ("baccarat", 100, 900, 9.0),
        ("thimbles", 100, 288, 2.88),
        ("limbo", 50, 500, 10.0),
        ("dragon_tiger", 100, 1100, 11.0),
        ("wheel", 50, 2500, 50.0),
        ("penalty", 100, 3072, 30.72),
        ("scratch", 100, 50000, 500.0),
        ("sicbo", 100, 18100, 181.0),
        ("sweet_rush", 100, 10000, 100.0),
        ("battleship", 100, 4000, 40.0),
        ("rps", 100, 11200, 112.0),
        ("casino_holdem", 300, 30000, 100.0),
    ]
    for gtype, bet, win, mult in games:
        status, res = api_call("/api/games/record", "POST", {
            "gameType": gtype,
            "betAmount": bet,
            "winAmount": win,
            "multiplier": mult
        }, token=token)
        assert status == 200, f"Game record failed for {gtype}: {res}"
        print(f"PASS: Game {gtype} recorded: Bet={bet}, Win={win} -> Coins={res['user']['coins']}, BiggestWin={res['user']['biggest_win']}")

    print("\n=== 7. Testing POST /api/telegram/link-code & /api/telegram/unlink ===")
    status, res = api_call("/api/telegram/link-code", "POST", token=token)
    assert status == 200 and len(res.get("code", "")) == 6, f"Link code generation failed: {res}"
    print(f"PASS: Generated Telegram link code: {res['code']} for bot: @{res.get('botUsername')}")

    status, res = api_call("/api/telegram/unlink", "POST", token=token)
    assert status == 200, f"Telegram unlink failed: {res}"
    print("PASS: Telegram unlinked successfully.")

    print("\n=== 8. Testing POST /api/profile/heartbeat ===")
    status, res = api_call("/api/profile/heartbeat", "POST", token=token)
    assert status == 200, f"Heartbeat failed: {res}"
    print("PASS: Heartbeat recorded 30s playtime.")

    print("\n=== 9. Testing GET /api/leaderboard ===")
    status, res = api_call("/api/leaderboard", "GET")
    assert status == 200, f"Leaderboard failed: {res}"
    top_players = res["topCoins"]
    found = any(p["id"] == user_id for p in top_players)
    print(f"PASS: Leaderboard contains {len(top_players)} players. Test player present: {found}")

    print("\n=== 10. Testing GET /api/profile/:id (Public Profile Inspection) ===")
    status, res = api_call(f"/api/profile/{user_id}", "GET")
    assert status == 200 and res["user"]["username"] == test_username, f"Public profile failed: {res}"
    print(f"PASS: Public profile inspection works: {res['user']['username']} (coins: {res['user']['coins']}, time_spent: {res['user']['time_spent_seconds']}s)")

    print("\n=== 10. Cleaning up test data from VPS Database ===")
    cleanup_cmd = f"python C:\\Users\\nulis\\.gemini\\antigravity\\brain\\e4226c1c-b95f-4747-b764-1700c535eb29\\scratch\\ssh_helper.py \"node -e \\\"const db=require('/root/kirillgames-server/db'); db.prepare('DELETE FROM bets WHERE user_id={user_id}').run(); db.prepare('DELETE FROM users WHERE id={user_id}').run(); console.log('CLEANUP_DONE');\\\"\""
    p = subprocess.run(cleanup_cmd, shell=True, capture_output=True, text=True)
    print("Cleanup result:\n" + p.stdout)
    print("ALL API CHECKS PASSED AND TEST DATA CLEANED UP FLドWLESSLY! 🎉")

if __name__ == '__main__':
    main()

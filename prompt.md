Hello Copilot. I need to securely refactor the authentication flow in [Security.js](cci:7://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:0:0-0:0) without breaking the existing UI and routing logic in our vanilla JS SPA.

Currently, we parse login credentials and call a custom RPC: `sb.rpc('login_with_tc', ...)`. If successful, we store the state in `localStorage` (`sporcu_app_user` / `sporcu_app_sporcu`). 
However, this relies on a public `anon` key, which is insecure. We have already updated our database so that every athlete/coach has a Supabase Auth user registered with the email format: `[TC_NUMBER]@dragosfk.com`.

Please refactor [_securityDoNormalLogin(role)](cci:1://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:203:0-446:1) in [Security.js](cci:7://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:0:0-0:0) with the following strict requirements:

1. **Swap RPC with Native Auth:**
   - Remove the `sb.rpc('login_with_tc', ...)` call completely.
   - Use standard Supabase Auth: 
     `const email = tc + "@dragosfk.com";`
     `const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password: pass });`
   - Handle `authError` properly by showing "TC Kimlik No veya Şifre Hatalı" using the existing [showErr()](cci:1://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:225:8-229:9) function.

2. **Fetch User Data Securely:**
   - If `signInWithPassword` is successful, Supabase automatically sets the secure session. 
   - Now that we have a secure session, query the respective table to get the user data for `localStorage`:
     - If `role === 'coach'`, run `await sb.from('coaches').select('*').eq('tc', tc).single()`.
     - If `role === 'sporcu'`, run `await sb.from('athletes').select('*').eq('tc', tc).single()`.

3. **Keep LocalStorage and UI Routing Intact (CRITICAL):**
   - Take the data fetched from the tables and proceed with the EXACT SAME logic currently present in [_securityDoNormalLogin](cci:1://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:203:0-446:1).
   - Keep populating `window.AppState` and storing data in `StorageManager.set('sporcu_app_user', ...)` or `StorageManager.set('sporcu_app_sporcu', ...)`.
   - Preserve all DOM manipulation (`lboxWrap.style.display = 'none'`, `wrap.classList.remove('dn')`, etc.).
   - Do not change how the UI behaves. Only change the network fetching (Auth + Select) part.

4. **Rate Limiting Cleanup:**
   - Remove the custom client-side brute-force blocks ([_checkRateLimit](cci:1://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:146:0-160:1), [_recordFailedAttempt](cci:1://file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main%282%29/Sporcu-paneli-main/Security.js:162:0-175:1)) because Supabase Auth handles brute-force natively on the server side.

Please output the completely rewritten `_securityDoNormalLogin` function that perfectly integrates Supabase Auth while keeping our UI architecture safe.

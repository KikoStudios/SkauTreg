/**
 * VERSION UPDATE DETECTION SYSTEM
 * 
 * HOW IT WORKS:
 * 
 * 1. VERSION DEFINITION (Manual)
 *    - You edit /src/config/updates.json to add/modify versions
 *    - Each entry has: version, title, description, tags, releaseDate
 *    - When you commit & push to GitHub, it automatically deploys to Vercel
 * 
 * 2. APP CHECKS FOR NEW VERSIONS (Auto)
 *    - When user loads the app, it calls /api/supernotes/updates
 *    - This API fetches and returns the latest version from updates.json
 *    - It compares: "latestVersion" from JSON vs "user's lastSeenVersion" in database
 * 
 * 3. IF NEW VERSION EXISTS
 *    - Popup notification appears after ~2 seconds
 *    - Shows version number + description from the JSON
 *    - User can click "Detaily" (Details) to see full changelog
 * 
 * 4. DATABASE TRACKING
 *    - User's last seen version is stored in Convex database
 *    - User can dismiss/ignore updates
 *    - System remembers what versions they've already seen
 * 
 * IMPORTANT:
 * ❌ NO automatic GitHub/Vercel detection
 * ❌ NO polling GitHub API
 * ❌ NO checking deployment status
 * 
 * ✅ MANUAL workflow:
 *    1. Edit updates.json (local file)
 *    2. Commit & push (GitHub action - auto deploys)
 *    3. App detects new version on next page load
 *    4. Shows notification to user
 * 
 * TESTING:
 * - Use ?forceUpdate=1 URL parameter to test without waiting
 * - Modify updates.json, save, refresh with ?forceUpdate=1
 * 
 * EXAMPLE:
 * To add version 2.2.0 with a feature description:
 * 
 *   {
 *     "version": "2.2.0",
 *     "title": "Performance Improvements",
 *     "tags": ["performance", "ui"],
 *     "description": "Optimized dashboard load time by 40%, improved member search speed",
 *     "releaseDate": "2024-01-29"
 *   }
 * 
 * After you add this and push to GitHub, the next time a user loads the app,
 * they will see a notification about version 2.2.0 with that description.
 */

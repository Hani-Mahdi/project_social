# Testing Checklist

## 🧪 Test All Fixes

### 1. Environment Variables
- [ ] App starts without errors
- [ ] No console errors about missing Supabase credentials
- [ ] Check browser console for any credential-related errors

**How to test:**
```bash
cd project_social/growth-copilot
npm run dev
```
Open http://localhost:8080 and check browser console (F12)

---

### 2. Authentication & Session Timeout
- [ ] Can log in successfully
- [ ] Can log out successfully
- [ ] After 5 minutes of inactivity, redirects to `/auth?timeout=true`
- [ ] No memory leaks (check browser task manager)

**How to test:**
1. Log in
2. Wait 5 minutes without touching mouse/keyboard
3. Should automatically redirect to login page

---

### 3. Video Upload Limits
- [ ] Can upload first video
- [ ] Can upload second video
- [ ] Can upload third video
- [ ] **Cannot upload 4th video** (should show error)
- [ ] After deleting one video, can upload again
- [ ] File extension validation works (try uploading .txt file)

**How to test:**
```bash
# Try uploading these files:
✅ test.mp4 (should work)
✅ test.mov (should work)
✅ test.webm (should work)
❌ test.txt (should fail)
❌ test.exe (should fail)
❌ noextension (should fail)
```

---

### 4. Draft Creation & Editing
- [ ] Create a new draft with multiple platforms selected
- [ ] Save and navigate away
- [ ] Edit the draft
- [ ] **Platforms should still be selected** (was previously broken)
- [ ] Can update title and caption
- [ ] Changes save correctly

**How to test:**
1. Upload a video
2. Select TikTok, Instagram, YouTube
3. Add title "Test Video"
4. Save draft
5. Go to dashboard
6. Click edit on the draft
7. **Verify all 3 platforms are still selected**

---

### 5. YouTube OAuth
- [ ] Click "Connect YouTube"
- [ ] Redirects to Google OAuth
- [ ] After authorization, redirects back
- [ ] Shows "YouTube Connected" success message
- [ ] Connection saved in database
- [ ] Can disconnect YouTube

**How to test:**
1. Go to Settings
2. Click "Connect YouTube"
3. Complete OAuth flow
4. Check if connection shows as connected

---

### 6. Platform Filtering
- [ ] Click on a platform card in dashboard
- [ ] Shows only videos for that platform
- [ ] Filter works correctly
- [ ] No crashes when clicking different platforms

---

### 7. Error Handling
- [ ] Upload limit error message is clear
- [ ] OAuth errors show user-friendly messages
- [ ] File validation errors are descriptive
- [ ] Network errors handled gracefully

---

### 8. Performance
- [ ] No console errors in browser
- [ ] No memory leaks (check after 10 minutes of use)
- [ ] Event listeners cleaned up properly
- [ ] No infinite re-renders

**How to test:**
1. Open browser DevTools → Performance tab
2. Record for 30 seconds
3. Check for memory leaks
4. Check for excessive re-renders

---

## 🐛 Known Issues to Watch For

### If YouTube OAuth fails:
- Check `YOUTUBE_CLIENT_SECRET` is set in edge function
- Check `ALLOWED_ORIGINS` includes your domain
- Check browser console for CORS errors

### If upload limit doesn't work:
- Verify database trigger was created (run SQL query)
- Check Supabase logs for trigger errors
- Try uploading directly via API to test server-side enforcement

### If drafts don't load platforms:
- Check browser console for errors
- Verify `posts` table has correct platform values
- Check if `getVideoWithPosts` returns data

---

## ✅ All Tests Passed?

If all tests pass:
1. Commit your changes
2. Push to GitHub
3. Deploy to production (if using Vercel/Netlify)
4. Monitor error logs for 24 hours

If any tests fail:
1. Check browser console for errors
2. Check Supabase logs
3. Verify environment variables are set
4. Ask for help with specific error messages

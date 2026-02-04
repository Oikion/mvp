# Changelog Usage Guide

Quick reference for choosing and using the right changelog for your needs.

---

## 📋 Quick Decision Tree

```
Need to publish a changelog?
│
├─ For website/marketing?
│  │
│  ├─ Main changelog page? → Use website-v1.0.0-pre-release.md (Full version)
│  ├─ Blog post? → Use website-v1.0.0-pre-release.md (Full version)
│  ├─ Changelog list? → Use website-v1.0.0-pre-release-summary.md (Summary)
│  ├─ Social media? → Use website-v1.0.0-pre-release-announcement.md (Announcement)
│  └─ Email newsletter? → Use website-v1.0.0-pre-release-announcement.md (Announcement)
│
├─ For active users in-app?
│  └─ Use Platform Admin → Changelog interface
│
└─ For developers/GitHub?
   └─ Use ../../CHANGELOG.md (Technical changelog)
```

---

## 📄 Available Changelog Versions

### 1. Full Website Changelog
**File**: `website-v1.0.0-pre-release.md`

**Use when:**
- Creating main changelog page on website
- Writing detailed blog post
- Need comprehensive feature documentation
- Want to provide getting started guide
- Need to explain roadmap and future plans

**Characteristics:**
- ✅ ~1000 lines, very detailed
- ✅ User-friendly language
- ✅ Includes examples and use cases
- ✅ Has getting started section
- ✅ Includes roadmap
- ✅ Has feedback section

**Best for:**
- Main website changelog page
- Documentation site
- Detailed blog posts
- Product launch announcements

---

### 2. Summary Website Changelog
**File**: `website-v1.0.0-pre-release-summary.md`

**Use when:**
- Creating changelog list/index page
- Need quick overview
- Space is limited
- Want scannable content
- Need key highlights only

**Characteristics:**
- ✅ ~300 lines, condensed
- ✅ Bullet points and lists
- ✅ Key features highlighted
- ✅ Quick facts and numbers
- ✅ Easy to scan

**Best for:**
- Changelog list pages
- Quick reference
- Product comparison pages
- Landing page sections

---

### 3. Announcement Changelog
**File**: `website-v1.0.0-pre-release-announcement.md`

**Use when:**
- Posting on social media
- Sending email newsletter
- Need short announcement
- Want call-to-action focus
- Space is very limited

**Characteristics:**
- ✅ ~100 lines, brief
- ✅ Exciting, engaging tone
- ✅ Clear call-to-action
- ✅ Shareable format
- ✅ Hashtags included

**Best for:**
- Twitter/X posts
- LinkedIn updates
- Email newsletters
- Blog announcement snippets
- Press releases

---

### 4. In-App Changelog
**Location**: Platform Admin → Changelog

**Use when:**
- Notifying active users
- Announcing new features to logged-in users
- Need rich text formatting
- Want categorized entries
- Need version tracking

**Characteristics:**
- ✅ Rich text editor
- ✅ Categories and tags
- ✅ Version management
- ✅ Draft/Published status
- ✅ User-facing display

**Best for:**
- In-app notifications
- User dashboard updates
- Feature announcements to active users
- Version-specific updates

---

### 5. Technical Changelog
**File**: `../../CHANGELOG.md`

**Use when:**
- Documenting for developers
- GitHub repository
- Technical documentation
- API changes
- Breaking changes

**Characteristics:**
- ✅ Keep a Changelog format
- ✅ Technical language
- ✅ Migration notes
- ✅ Breaking changes
- ✅ Developer-focused

**Best for:**
- GitHub repository
- Developer documentation
- API documentation
- Technical blog posts
- Release notes for developers

---

## 🎯 Use Case Examples

### Example 1: Product Launch
**Goal**: Announce v1.0.0 pre-release to the world

**Use:**
1. **Full changelog** on main website changelog page
2. **Announcement** for social media posts
3. **Announcement** for email to subscribers
4. **In-app entry** to notify existing users
5. **Technical changelog** for GitHub release

---

### Example 2: Quick Feature Update
**Goal**: Announce small feature addition

**Use:**
1. **In-app entry** to notify users
2. **Summary** for quick blog post
3. **Technical changelog** update for developers

---

### Example 3: Social Media Campaign
**Goal**: Drive awareness and signups

**Use:**
1. **Announcement** for Twitter/LinkedIn
2. **Summary** linked from social posts
3. **Full changelog** as landing page

---

### Example 4: Email Newsletter
**Goal**: Update subscribers about new release

**Use:**
1. **Announcement** as email body
2. Link to **Full changelog** for details
3. **In-app entry** for logged-in users

---

## ✏️ Customization Tips

### For Website Changelogs

**Before publishing:**
1. ✅ Update all links to your actual domain
2. ✅ Replace placeholder email addresses
3. ✅ Add your actual contact information
4. ✅ Include screenshots or videos if available
5. ✅ Adjust branding and tone to match your voice
6. ✅ Translate to Greek if needed
7. ✅ Test all links

**Optional additions:**
- Screenshots of new features
- Video walkthrough
- Customer testimonials
- Comparison tables
- Pricing information
- FAQ section

---

### For In-App Changelogs

**Best practices:**
1. ✅ Use templates for consistency
2. ✅ Choose appropriate category
3. ✅ Add relevant tags
4. ✅ Include version number
5. ✅ Link to documentation
6. ✅ Keep it concise
7. ✅ Use rich text formatting

**Formatting tips:**
- Use headings for structure
- Bold important points
- Add bullet lists
- Include callouts for warnings/tips
- Link to related features
- Add images if helpful

---

## 📊 Changelog Comparison Table

| Feature | Full | Summary | Announcement | In-App | Technical |
|---------|------|---------|--------------|--------|-----------|
| **Length** | ~1000 lines | ~300 lines | ~100 lines | Variable | Variable |
| **Audience** | Public | Public | Public | Active users | Developers |
| **Tone** | User-friendly | Concise | Exciting | Actionable | Technical |
| **Detail Level** | Very high | Medium | Low | Medium | High |
| **Use Case** | Main page | List page | Social media | In-app | GitHub |
| **Format** | Markdown | Markdown | Markdown | Rich text | Markdown |
| **Best For** | Documentation | Overview | Announcements | Notifications | Dev docs |

---

## 🚀 Publishing Checklist

### Before Publishing Any Changelog

- [ ] Version number is correct
- [ ] Release date is accurate
- [ ] All links work
- [ ] Contact information is current
- [ ] Spelling and grammar checked
- [ ] Tone matches audience
- [ ] Call-to-action is clear
- [ ] Screenshots/videos added (if applicable)
- [ ] Translated to Greek (if needed)
- [ ] Reviewed by team

### Website Changelog Specific

- [ ] Domain links updated
- [ ] Email addresses correct
- [ ] Social media links work
- [ ] Branding consistent
- [ ] SEO optimized
- [ ] Mobile-friendly
- [ ] Analytics tracking added

### In-App Changelog Specific

- [ ] Category selected
- [ ] Tags added
- [ ] Version number set
- [ ] Rich text formatted
- [ ] Links tested
- [ ] Published (not draft)
- [ ] Notification sent

---

## 💡 Pro Tips

### For Maximum Impact

1. **Use multiple formats**: Publish announcement on social, summary on list page, full on main page
2. **Cross-link**: Link between different changelog versions
3. **Update regularly**: Keep changelogs current and accurate
4. **Gather feedback**: Ask users what they think
5. **Track metrics**: Monitor which changelog format gets most engagement

### For Better Engagement

1. **Add visuals**: Screenshots, videos, GIFs
2. **Tell stories**: Explain why features matter
3. **Show examples**: Real-world use cases
4. **Include quotes**: Customer testimonials
5. **Make it scannable**: Use lists, headers, emojis

### For SEO

1. **Use keywords**: Include relevant search terms
2. **Add meta descriptions**: Summarize the changelog
3. **Internal linking**: Link to other documentation
4. **Update sitemap**: Include changelog pages
5. **Schema markup**: Use structured data

---

## 📞 Questions?

If you're unsure which changelog to use:

1. **Consider your audience**: Who will read it?
2. **Consider the medium**: Where will it be published?
3. **Consider the goal**: What action do you want readers to take?
4. **When in doubt**: Use the full version and link to it from shorter versions

---

**Last Updated**: February 3, 2026  
**Version**: 1.0.0-pre-release  
**Maintainer**: Oikion Development Team

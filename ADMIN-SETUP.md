# Admin panel setup (one time, about 10 minutes, free)

The admin page is `admin.html` (https://shuklajionline.github.io/lal-pathology-mahoba/admin.html).
Staff log in with an email and password and can post offers, change notices and opening hours, edit tests and prices, and upload photos.

## 1. Create a free Firebase project
1. Go to https://console.firebase.google.com and sign in with the shop's Google account.
2. **Add project** -> name it `shree-lal-pathology` -> Google Analytics can be off.

## 2. Turn on login
1. **Build -> Authentication -> Get started -> Sign-in method -> Email/Password -> Enable.**
2. **Users tab -> Add user:** create one account per staff member (email + password).
   Only people added here can log in. Nobody can sign themselves up from the website.

## 3. Create the database
1. **Build -> Firestore Database -> Create database** -> choose a region near India (e.g. `asia-south1`) -> **Production mode**.
2. Open the **Rules** tab, replace everything with the rules below, and **Publish**.
   Replace the emails with your staff emails.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Everyone can read what the website shows.
    match /site/{doc}   { allow read: if true; }
    match /tests/{doc}  { allow read: if true; }
    match /photos/{doc} { allow read: if true; }

    // Only these staff emails can change anything.
    match /{document=**} {
      allow write: if request.auth != null
        && request.auth.token.email in [
          "owner@example.com",
          "staff@example.com"
        ];
    }
  }
}
```

## 4. Connect the website
1. **Project settings (gear icon) -> General -> Your apps -> Web (`</>`)** -> register an app.
2. Copy `apiKey`, `authDomain`, `projectId`, `appId` into `firebase-config.js`.
   These values are not secrets; the rules above are what protect your data.
3. **Authentication -> Settings -> Authorized domains -> Add** `shuklajionline.github.io`.
4. Commit and push `firebase-config.js`.

## 5. Use it
- Open `/admin.html`, log in.
- **Tests & prices -> Load default test list**, then fill in prices.
- **Offers & notices:** tick "Show offer", write the text, optionally set an end date.
- Changes appear on the website within a minute. Until Firebase is connected the website just shows its normal built-in content.

## Notes
- Photos are shrunk in the browser and stored in the database (free). Keep the gallery to a few dozen photos.
- Free-tier limits are generous for a small lab (about 50,000 reads per day).
- Opening hours text only changes the visible text; Google's own listing (Business Profile) must be updated separately.

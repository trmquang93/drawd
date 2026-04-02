/**
 * Generates simple SVG wireframe data URIs for template screen placeholders.
 * Each wireframe is a minimal representation of a mobile screen layout.
 */

const W = 220;
const H = 390;
const BG = "#1e2127";
const SURFACE = "#2c313a";
const BORDER = "#3e4451";
const TEXT = "#abb2bf";
const TEXT_DIM = "#5c6370";
const ACCENT = "#61afef";

function svgToDataUri(svgContent) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgContent}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function rect(x, y, w, h, fill = SURFACE, rx = 4) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
}

function line(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BORDER}" stroke-width="1"/>`;
}

function button(x, y, w, h, label, fill = ACCENT) {
  return `${rect(x, y, w, h, fill, 6)}<text x="${x + w / 2}" y="${y + h / 2 + 4}" font-family="sans-serif" font-size="11" fill="#fff" text-anchor="middle">${label}</text>`;
}

function inputField(x, y, w, label) {
  return `${rect(x, y, w, 32, SURFACE, 4)}<rect x="${x}" y="${y}" width="${w}" height="32" fill="none" stroke="${BORDER}" rx="4"/><text x="${x + 8}" y="${y + 20}" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">${label}</text>`;
}

function statusBar() {
  return `${rect(0, 0, W, 24, BG)}<text x="12" y="16" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}">9:41</text><text x="${W - 12}" y="16" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}" text-anchor="end">100%</text>`;
}

function navBar(title, showBack = false) {
  let content = `${rect(0, 24, W, 44, BG)}${line(0, 68, W, 68)}`;
  content += `<text x="${W / 2}" y="51" font-family="sans-serif" font-size="13" fill="${TEXT}" text-anchor="middle" font-weight="600">${title}</text>`;
  if (showBack) {
    content += `<text x="12" y="51" font-family="sans-serif" font-size="13" fill="${ACCENT}">&lt;</text>`;
  }
  return content;
}

function tabBar(tabs, activeIndex = 0) {
  const y = H - 52;
  let content = `${line(0, y, W, y)}${rect(0, y, W, 52, BG)}`;
  const tabW = W / tabs.length;
  tabs.forEach((tab, i) => {
    const cx = tabW * i + tabW / 2;
    const fill = i === activeIndex ? ACCENT : TEXT_DIM;
    content += `<circle cx="${cx}" cy="${y + 16}" r="6" fill="none" stroke="${fill}" stroke-width="1.5"/>`;
    content += `<text x="${cx}" y="${y + 38}" font-family="sans-serif" font-size="8" fill="${fill}" text-anchor="middle">${tab}</text>`;
  });
  return content;
}

// ── Screen wireframes ─────────────────────────────────────────

export function loginScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Login")}` +
    `<circle cx="${W / 2}" cy="120" r="24" fill="${SURFACE}" stroke="${BORDER}"/>` +
    `<text x="${W / 2}" y="125" font-family="sans-serif" font-size="18" fill="${TEXT_DIM}" text-anchor="middle">:)</text>` +
    `${inputField(20, 170, W - 40, "Email")}` +
    `${inputField(20, 215, W - 40, "Password")}` +
    `${button(20, 270, W - 40, 36, "Log In")}` +
    `<text x="${W / 2}" y="330" font-family="sans-serif" font-size="10" fill="${ACCENT}" text-anchor="middle">Forgot Password?</text>` +
    `<text x="${W / 2}" y="355" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">Don't have an account? Sign Up</text>`
  );
}

export function signupScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Sign Up", true)}` +
    `${inputField(20, 90, W - 40, "Full Name")}` +
    `${inputField(20, 135, W - 40, "Email")}` +
    `${inputField(20, 180, W - 40, "Password")}` +
    `${inputField(20, 225, W - 40, "Confirm Password")}` +
    `${button(20, 280, W - 40, 36, "Create Account")}` +
    `<text x="${W / 2}" y="340" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">Already have an account? Log In</text>`
  );
}

export function forgotPasswordScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Reset Password", true)}` +
    `<text x="${W / 2}" y="110" font-family="sans-serif" font-size="11" fill="${TEXT}" text-anchor="middle">Enter your email to receive</text>` +
    `<text x="${W / 2}" y="126" font-family="sans-serif" font-size="11" fill="${TEXT}" text-anchor="middle">a password reset link.</text>` +
    `${inputField(20, 155, W - 40, "Email")}` +
    `${button(20, 210, W - 40, 36, "Send Reset Link")}`
  );
}

export function emailVerificationScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Verify Email", true)}` +
    `<circle cx="${W / 2}" cy="130" r="28" fill="none" stroke="${ACCENT}" stroke-width="2"/>` +
    `<text x="${W / 2}" y="136" font-family="sans-serif" font-size="20" fill="${ACCENT}" text-anchor="middle">&#x2709;</text>` +
    `<text x="${W / 2}" y="185" font-family="sans-serif" font-size="12" fill="${TEXT}" text-anchor="middle">Check your inbox</text>` +
    `<text x="${W / 2}" y="205" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">We sent a verification link</text>` +
    `${button(20, 240, W - 40, 36, "Open Email App")}` +
    `<text x="${W / 2}" y="305" font-family="sans-serif" font-size="10" fill="${ACCENT}" text-anchor="middle">Resend Email</text>`
  );
}

export function welcomeScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}` +
    `${rect(20, 60, W - 40, 160, SURFACE, 12)}` +
    `<text x="${W / 2}" y="150" font-family="sans-serif" font-size="16" fill="${TEXT_DIM}" text-anchor="middle">Illustration</text>` +
    `<text x="${W / 2}" y="250" font-family="sans-serif" font-size="16" fill="${TEXT}" text-anchor="middle" font-weight="600">Welcome</text>` +
    `<text x="${W / 2}" y="275" font-family="sans-serif" font-size="11" fill="${TEXT_DIM}" text-anchor="middle">Discover what this app can do</text>` +
    `${button(20, 320, W - 40, 36, "Get Started")}` +
    `<text x="${W / 2}" y="375" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">Skip</text>`
  );
}

export function permissionsScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Permissions", true)}` +
    `<text x="${W / 2}" y="100" font-family="sans-serif" font-size="13" fill="${TEXT}" text-anchor="middle" font-weight="600">Allow Access</text>` +
    // Permission rows
    `${rect(20, 120, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="147" font-family="sans-serif" font-size="11" fill="${TEXT}">Notifications</text>` +
    `${rect(160, 133, 36, 18, ACCENT, 9)}` +
    `${rect(20, 175, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="202" font-family="sans-serif" font-size="11" fill="${TEXT}">Camera</text>` +
    `${rect(160, 188, 36, 18, BORDER, 9)}` +
    `${rect(20, 230, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="257" font-family="sans-serif" font-size="11" fill="${TEXT}">Location</text>` +
    `${rect(160, 243, 36, 18, BORDER, 9)}` +
    `${button(20, 310, W - 40, 36, "Continue")}`
  );
}

export function tutorialScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}` +
    `${rect(20, 50, W - 40, 180, SURFACE, 12)}` +
    `<text x="${W / 2}" y="150" font-family="sans-serif" font-size="14" fill="${TEXT_DIM}" text-anchor="middle">Feature Preview</text>` +
    `<text x="${W / 2}" y="265" font-family="sans-serif" font-size="13" fill="${TEXT}" text-anchor="middle" font-weight="600">How It Works</text>` +
    `<text x="${W / 2}" y="288" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">Step-by-step guide description</text>` +
    // Page dots
    `<circle cx="95" cy="320" r="4" fill="${ACCENT}"/>` +
    `<circle cx="110" cy="320" r="4" fill="${BORDER}"/>` +
    `<circle cx="125" cy="320" r="4" fill="${BORDER}"/>` +
    `${button(20, 345, W - 40, 36, "Next")}`
  );
}

export function getStartedScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}` +
    `${rect(20, 50, W - 40, 180, SURFACE, 12)}` +
    `<text x="${W / 2}" y="150" font-family="sans-serif" font-size="14" fill="${TEXT_DIM}" text-anchor="middle">Success</text>` +
    `<text x="${W / 2}" y="265" font-family="sans-serif" font-size="15" fill="${TEXT}" text-anchor="middle" font-weight="600">You're All Set!</text>` +
    `<text x="${W / 2}" y="290" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">Start exploring the app</text>` +
    `${button(20, 330, W - 40, 36, "Let's Go")}`
  );
}

export function profileSettingsScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Profile", true)}` +
    `<circle cx="${W / 2}" cy="110" r="28" fill="${SURFACE}" stroke="${BORDER}"/>` +
    `<text x="${W / 2}" y="116" font-family="sans-serif" font-size="16" fill="${TEXT_DIM}" text-anchor="middle">AB</text>` +
    `<text x="${W / 2}" y="155" font-family="sans-serif" font-size="12" fill="${TEXT}" text-anchor="middle">User Name</text>` +
    `${inputField(20, 180, W - 40, "Display Name")}` +
    `${inputField(20, 225, W - 40, "Email")}` +
    `${inputField(20, 270, W - 40, "Phone")}` +
    `${button(20, 325, W - 40, 36, "Save Changes")}`
  );
}

export function preferencesScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Preferences", true)}` +
    `${rect(20, 85, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="112" font-family="sans-serif" font-size="11" fill="${TEXT}">Dark Mode</text>` +
    `${rect(160, 98, 36, 18, ACCENT, 9)}` +
    `${rect(20, 140, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="167" font-family="sans-serif" font-size="11" fill="${TEXT}">Language</text>` +
    `<text x="185" y="167" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="end">English</text>` +
    `${rect(20, 195, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="222" font-family="sans-serif" font-size="11" fill="${TEXT}">Currency</text>` +
    `<text x="185" y="222" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="end">USD</text>` +
    `${rect(20, 260, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="287" font-family="sans-serif" font-size="11" fill="${TEXT}">Clear Cache</text>`
  );
}

export function notificationsScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Notifications", true)}` +
    `${rect(20, 85, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="112" font-family="sans-serif" font-size="11" fill="${TEXT}">Push Notifications</text>` +
    `${rect(160, 98, 36, 18, ACCENT, 9)}` +
    `${rect(20, 140, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="167" font-family="sans-serif" font-size="11" fill="${TEXT}">Email Alerts</text>` +
    `${rect(160, 153, 36, 18, ACCENT, 9)}` +
    `${rect(20, 195, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="222" font-family="sans-serif" font-size="11" fill="${TEXT}">Marketing</text>` +
    `${rect(160, 208, 36, 18, BORDER, 9)}` +
    `${rect(20, 250, W - 40, 44, SURFACE, 8)}` +
    `<text x="36" y="277" font-family="sans-serif" font-size="11" fill="${TEXT}">Sound</text>` +
    `${rect(160, 263, 36, 18, ACCENT, 9)}`
  );
}

export function productListScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Products")}` +
    // Search bar
    `${rect(15, 78, W - 30, 30, SURFACE, 6)}<text x="28" y="97" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Search products...</text>` +
    // Product grid
    `${rect(15, 118, 90, 100, SURFACE, 8)}` +
    `<text x="60" y="175" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}" text-anchor="middle">Image</text>` +
    `<text x="20" y="232" font-family="sans-serif" font-size="9" fill="${TEXT}">Product A</text>` +
    `<text x="20" y="245" font-family="sans-serif" font-size="9" fill="${ACCENT}">$29.99</text>` +
    `${rect(115, 118, 90, 100, SURFACE, 8)}` +
    `<text x="160" y="175" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}" text-anchor="middle">Image</text>` +
    `<text x="120" y="232" font-family="sans-serif" font-size="9" fill="${TEXT}">Product B</text>` +
    `<text x="120" y="245" font-family="sans-serif" font-size="9" fill="${ACCENT}">$49.99</text>` +
    `${rect(15, 260, 90, 100, SURFACE, 8)}` +
    `<text x="60" y="317" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}" text-anchor="middle">Image</text>` +
    `${rect(115, 260, 90, 100, SURFACE, 8)}` +
    `<text x="160" y="317" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}" text-anchor="middle">Image</text>` +
    `${tabBar(["Home", "Search", "Cart", "Profile"], 0)}`
  );
}

export function productDetailScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Product Detail", true)}` +
    `${rect(0, 68, W, 150, SURFACE)}` +
    `<text x="${W / 2}" y="150" font-family="sans-serif" font-size="14" fill="${TEXT_DIM}" text-anchor="middle">Product Image</text>` +
    `<text x="20" y="240" font-family="sans-serif" font-size="14" fill="${TEXT}" font-weight="600">Product Name</text>` +
    `<text x="20" y="260" font-family="sans-serif" font-size="13" fill="${ACCENT}">$29.99</text>` +
    `<text x="20" y="285" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Product description goes here.</text>` +
    `<text x="20" y="300" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Details about the item...</text>` +
    `${button(20, 330, W - 40, 36, "Add to Cart")}`
  );
}

export function cartScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Cart", true)}` +
    // Cart items
    `${rect(15, 80, W - 30, 60, SURFACE, 8)}` +
    `${rect(22, 87, 46, 46, BORDER, 4)}` +
    `<text x="78" y="105" font-family="sans-serif" font-size="10" fill="${TEXT}">Product A</text>` +
    `<text x="78" y="120" font-family="sans-serif" font-size="10" fill="${ACCENT}">$29.99</text>` +
    `<text x="190" y="112" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="end">x1</text>` +
    `${rect(15, 150, W - 30, 60, SURFACE, 8)}` +
    `${rect(22, 157, 46, 46, BORDER, 4)}` +
    `<text x="78" y="175" font-family="sans-serif" font-size="10" fill="${TEXT}">Product B</text>` +
    `<text x="78" y="190" font-family="sans-serif" font-size="10" fill="${ACCENT}">$49.99</text>` +
    `<text x="190" y="182" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="end">x2</text>` +
    // Total
    `${line(15, 240, W - 15, 240)}` +
    `<text x="20" y="265" font-family="sans-serif" font-size="12" fill="${TEXT}">Total</text>` +
    `<text x="${W - 20}" y="265" font-family="sans-serif" font-size="12" fill="${TEXT}" text-anchor="end" font-weight="600">$129.97</text>` +
    `${button(20, 300, W - 40, 36, "Checkout")}`
  );
}

export function checkoutScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Checkout", true)}` +
    `<text x="20" y="95" font-family="sans-serif" font-size="12" fill="${TEXT}" font-weight="600">Shipping</text>` +
    `${inputField(20, 105, W - 40, "Address")}` +
    `${inputField(20, 150, W - 40, "City")}` +
    `<text x="20" y="205" font-family="sans-serif" font-size="12" fill="${TEXT}" font-weight="600">Payment</text>` +
    `${inputField(20, 215, W - 40, "Card Number")}` +
    `${inputField(20, 260, 85, "MM/YY")}` +
    `${inputField(115, 260, 85, "CVC")}` +
    `${line(15, 310, W - 15, 310)}` +
    `<text x="20" y="335" font-family="sans-serif" font-size="12" fill="${TEXT}">Total: $129.97</text>` +
    `${button(20, 348, W - 40, 36, "Place Order")}`
  );
}

export function homeTabScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Home")}` +
    // Featured card
    `${rect(15, 78, W - 30, 100, SURFACE, 12)}` +
    `<text x="30" y="115" font-family="sans-serif" font-size="12" fill="${TEXT}" font-weight="600">Featured</text>` +
    `<text x="30" y="135" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Highlighted content here</text>` +
    // Section
    `<text x="15" y="205" font-family="sans-serif" font-size="12" fill="${TEXT}" font-weight="600">Recent</text>` +
    `${rect(15, 215, W - 30, 44, SURFACE, 8)}` +
    `<text x="30" y="242" font-family="sans-serif" font-size="10" fill="${TEXT}">Item 1</text>` +
    `${rect(15, 268, W - 30, 44, SURFACE, 8)}` +
    `<text x="30" y="295" font-family="sans-serif" font-size="10" fill="${TEXT}">Item 2</text>` +
    `${tabBar(["Home", "Search", "Profile", "Settings"], 0)}`
  );
}

export function searchTabScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Search")}` +
    `${rect(15, 78, W - 30, 30, SURFACE, 6)}<text x="28" y="97" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Search...</text>` +
    `<text x="15" y="135" font-family="sans-serif" font-size="11" fill="${TEXT}" font-weight="600">Categories</text>` +
    `${rect(15, 145, 90, 36, SURFACE, 8)}<text x="60" y="167" font-family="sans-serif" font-size="9" fill="${TEXT}" text-anchor="middle">Category A</text>` +
    `${rect(115, 145, 90, 36, SURFACE, 8)}<text x="160" y="167" font-family="sans-serif" font-size="9" fill="${TEXT}" text-anchor="middle">Category B</text>` +
    `${rect(15, 190, 90, 36, SURFACE, 8)}<text x="60" y="212" font-family="sans-serif" font-size="9" fill="${TEXT}" text-anchor="middle">Category C</text>` +
    `${rect(115, 190, 90, 36, SURFACE, 8)}<text x="160" y="212" font-family="sans-serif" font-size="9" fill="${TEXT}" text-anchor="middle">Category D</text>` +
    `${tabBar(["Home", "Search", "Profile", "Settings"], 1)}`
  );
}

export function profileTabScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Profile")}` +
    `<circle cx="${W / 2}" cy="115" r="32" fill="${SURFACE}" stroke="${BORDER}"/>` +
    `<text x="${W / 2}" y="121" font-family="sans-serif" font-size="18" fill="${TEXT_DIM}" text-anchor="middle">AB</text>` +
    `<text x="${W / 2}" y="165" font-family="sans-serif" font-size="13" fill="${TEXT}" text-anchor="middle" font-weight="600">User Name</text>` +
    `<text x="${W / 2}" y="183" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">user@email.com</text>` +
    `${rect(20, 205, W - 40, 40, SURFACE, 8)}<text x="36" y="230" font-family="sans-serif" font-size="11" fill="${TEXT}">Edit Profile</text>` +
    `${rect(20, 255, W - 40, 40, SURFACE, 8)}<text x="36" y="280" font-family="sans-serif" font-size="11" fill="${TEXT}">My Orders</text>` +
    `${rect(20, 305, W - 40, 40, SURFACE, 8)}<text x="36" y="330" font-family="sans-serif" font-size="11" fill="${TEXT}">Log Out</text>` +
    `${tabBar(["Home", "Search", "Profile", "Settings"], 2)}`
  );
}

export function settingsTabScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Settings")}` +
    `${rect(20, 85, W - 40, 40, SURFACE, 8)}<text x="36" y="110" font-family="sans-serif" font-size="11" fill="${TEXT}">Account</text>` +
    `${rect(20, 135, W - 40, 40, SURFACE, 8)}<text x="36" y="160" font-family="sans-serif" font-size="11" fill="${TEXT}">Notifications</text>` +
    `${rect(20, 185, W - 40, 40, SURFACE, 8)}<text x="36" y="210" font-family="sans-serif" font-size="11" fill="${TEXT}">Privacy</text>` +
    `${rect(20, 235, W - 40, 40, SURFACE, 8)}<text x="36" y="260" font-family="sans-serif" font-size="11" fill="${TEXT}">Help</text>` +
    `${rect(20, 285, W - 40, 40, SURFACE, 8)}<text x="36" y="310" font-family="sans-serif" font-size="11" fill="${TEXT}">About</text>` +
    `${tabBar(["Home", "Search", "Profile", "Settings"], 3)}`
  );
}

export function feedScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Feed")}` +
    // Post 1
    `${rect(10, 78, W - 20, 130, SURFACE, 8)}` +
    `<circle cx="28" cy="96" r="10" fill="${BORDER}"/>` +
    `<text x="44" y="100" font-family="sans-serif" font-size="10" fill="${TEXT}" font-weight="600">User A</text>` +
    `${rect(18, 112, W - 36, 65, BORDER, 4)}` +
    `<text x="${W / 2}" y="150" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}" text-anchor="middle">Post Image</text>` +
    `<text x="18" y="195" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}">12 likes  3 comments</text>` +
    // Post 2
    `${rect(10, 218, W - 20, 100, SURFACE, 8)}` +
    `<circle cx="28" cy="236" r="10" fill="${BORDER}"/>` +
    `<text x="44" y="240" font-family="sans-serif" font-size="10" fill="${TEXT}" font-weight="600">User B</text>` +
    `<text x="18" y="262" font-family="sans-serif" font-size="10" fill="${TEXT}">Just posted something cool!</text>` +
    `<text x="18" y="305" font-family="sans-serif" font-size="9" fill="${TEXT_DIM}">5 likes  1 comment</text>` +
    `${tabBar(["Feed", "Explore", "Post", "Inbox", "Me"], 0)}`
  );
}

export function postDetailScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Post", true)}` +
    `<circle cx="28" cy="86" r="12" fill="${BORDER}"/>` +
    `<text x="48" y="90" font-family="sans-serif" font-size="11" fill="${TEXT}" font-weight="600">User A</text>` +
    `${rect(10, 108, W - 20, 120, BORDER, 4)}` +
    `<text x="${W / 2}" y="170" font-family="sans-serif" font-size="12" fill="${TEXT_DIM}" text-anchor="middle">Full Image</text>` +
    `<text x="15" y="248" font-family="sans-serif" font-size="10" fill="${TEXT}">12 likes</text>` +
    `<text x="15" y="270" font-family="sans-serif" font-size="10" fill="${TEXT}">Caption text goes here...</text>` +
    `${line(10, 290, W - 10, 290)}` +
    `<text x="15" y="310" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Comments</text>` +
    `<text x="15" y="330" font-family="sans-serif" font-size="9" fill="${TEXT}">User B: Great post!</text>` +
    `${rect(10, H - 55, W - 20, 32, SURFACE, 6)}<text x="22" y="${H - 35}" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Add a comment...</text>`
  );
}

export function createPostScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("New Post", true)}` +
    `${rect(15, 80, W - 30, 140, SURFACE, 8)}` +
    `<text x="${W / 2}" y="155" font-family="sans-serif" font-size="12" fill="${TEXT_DIM}" text-anchor="middle">Tap to add photo</text>` +
    `${rect(15, 235, W - 30, 80, SURFACE, 8)}<rect x="15" y="235" width="${W - 30}" height="80" fill="none" stroke="${BORDER}" rx="8"/>` +
    `<text x="26" y="260" font-family="sans-serif" font-size="10" fill="${TEXT_DIM}">Write a caption...</text>` +
    `${button(20, 340, W - 40, 36, "Share")}`
  );
}

export function userProfileScreen() {
  return svgToDataUri(
    `${rect(0, 0, W, H, BG)}${statusBar()}${navBar("Profile", true)}` +
    `<circle cx="${W / 2}" cy="110" r="28" fill="${SURFACE}" stroke="${BORDER}"/>` +
    `<text x="${W / 2}" y="116" font-family="sans-serif" font-size="16" fill="${TEXT_DIM}" text-anchor="middle">AB</text>` +
    `<text x="${W / 2}" y="155" font-family="sans-serif" font-size="13" fill="${TEXT}" text-anchor="middle" font-weight="600">User Name</text>` +
    // Stats row
    `<text x="40" y="185" font-family="sans-serif" font-size="12" fill="${TEXT}" text-anchor="middle" font-weight="600">42</text>` +
    `<text x="40" y="198" font-family="sans-serif" font-size="8" fill="${TEXT_DIM}" text-anchor="middle">Posts</text>` +
    `<text x="${W / 2}" y="185" font-family="sans-serif" font-size="12" fill="${TEXT}" text-anchor="middle" font-weight="600">1.2K</text>` +
    `<text x="${W / 2}" y="198" font-family="sans-serif" font-size="8" fill="${TEXT_DIM}" text-anchor="middle">Followers</text>` +
    `<text x="180" y="185" font-family="sans-serif" font-size="12" fill="${TEXT}" text-anchor="middle" font-weight="600">350</text>` +
    `<text x="180" y="198" font-family="sans-serif" font-size="8" fill="${TEXT_DIM}" text-anchor="middle">Following</text>` +
    `${button(30, 210, W - 60, 28, "Edit Profile")}` +
    // Grid
    `${rect(10, 252, 62, 62, SURFACE, 2)}${rect(79, 252, 62, 62, SURFACE, 2)}${rect(148, 252, 62, 62, SURFACE, 2)}` +
    `${rect(10, 320, 62, 62, SURFACE, 2)}${rect(79, 320, 62, 62, SURFACE, 2)}${rect(148, 320, 62, 62, SURFACE, 2)}`
  );
}

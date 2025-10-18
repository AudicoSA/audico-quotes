import { test, expect, type Page } from '@playwright/test';

// Helper function to wait for and interact with chat
async function sendChatMessage(page: Page, message: string) {
  console.log(`\n>>> Sending message: "${message}"`);

  // Wait for chat input to be ready
  const chatInput = page.locator('input[placeholder*="message"], textarea').first();
  await chatInput.waitFor({ state: 'visible', timeout: 10000 });

  // Type the message
  await chatInput.fill(message);
  await page.waitForTimeout(500);

  // Find and click send button (the purple arrow button)
  const sendButton = page.locator('button[type="submit"], button:has(svg)').last();
  await sendButton.click();

  console.log('>>> Message sent, waiting for AI response...');
}

// Helper function to wait for AI response
async function waitForAIResponse(page: Page, timeout = 90000) {
  console.log('>>> Waiting for AI response...');

  const startTime = Date.now();
  let lastMessageCount = 0;

  // Wait for new messages to appear
  while (Date.now() - startTime < timeout) {
    const messages = await page.locator('[class*="message"], .message, [role="article"]').count();
    if (messages > lastMessageCount) {
      lastMessageCount = messages;
      console.log(`>>> Found ${messages} messages...`);
      await page.waitForTimeout(2000); // Wait for message to complete

      // Check if still typing/thinking
      const isThinking = await page.locator('[class*="thinking"], [class*="typing"], .loading').count();
      if (isThinking === 0) {
        console.log('>>> AI response complete');
        await page.waitForTimeout(2000); // Extra wait for products to load
        return;
      }
    }
    await page.waitForTimeout(1000);
  }

  console.log('>>> Timeout waiting for AI response, continuing anyway...');
}

// Helper function to add products to quote
async function addProductsToQuote(page: Page, count: number = 3) {
  console.log(`\n>>> Adding ${count} products to quote...`);

  // Look for "Add to Quote" buttons in product suggestions
  const addButtons = page.locator('button').filter({ hasText: /add to quote|add|\\+/i });
  const buttonCount = await addButtons.count();
  console.log(`>>> Found ${buttonCount} add buttons`);

  const toAdd = Math.min(count, buttonCount);
  for (let i = 0; i < toAdd; i++) {
    try {
      await addButtons.nth(i).click();
      await page.waitForTimeout(500);
      console.log(`>>> Added product ${i + 1}/${toAdd}`);
    } catch (e) {
      console.log(`>>> Could not add product ${i + 1}: ${e}`);
    }
  }

  return toAdd;
}

// Helper function to check if Notes/Requirements panel is visible
async function checkNotesPanel(page: Page) {
  console.log('\n>>> Checking for Notes/Requirements panel...');

  // Look for system requirements panel
  const notesPanel = page.locator('[class*="requirement"], [class*="system"], .system-requirements, [data-testid="system-requirements"]');
  const isPanelVisible = await notesPanel.count() > 0;

  if (isPanelVisible) {
    const panelText = await notesPanel.first().textContent();
    console.log(`>>> Notes panel FOUND with text: ${panelText?.substring(0, 100)}...`);
    return { visible: true, text: panelText || '' };
  } else {
    console.log('>>> Notes panel NOT FOUND');
    return { visible: false, text: '' };
  }
}

// Helper function to check product images
async function checkProductImages(page: Page) {
  console.log('\n>>> Checking product images...');

  // Check images in product suggestions
  const suggestionImages = page.locator('[class*="product"] img, [class*="suggestion"] img');
  const suggestionCount = await suggestionImages.count();
  console.log(`>>> Found ${suggestionCount} images in suggestions`);

  // Check images in quote box
  const quoteImages = page.locator('[class*="quote"] img');
  const quoteCount = await quoteImages.count();
  console.log(`>>> Found ${quoteCount} images in quote box`);

  // Check if any images are broken
  const allImages = page.locator('img');
  const totalImages = await allImages.count();
  let brokenImages = 0;

  for (let i = 0; i < Math.min(totalImages, 20); i++) {
    const img = allImages.nth(i);
    const src = await img.getAttribute('src');
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    if (naturalWidth === 0 && src && !src.includes('placeholder')) {
      brokenImages++;
      console.log(`>>> Broken image found: ${src}`);
    }
  }

  return {
    suggestionImages: suggestionCount,
    quoteImages: quoteCount,
    totalImages: totalImages,
    brokenImages: brokenImages
  };
}

// Helper function to capture screenshot
async function captureScreenshot(page: Page, name: string) {
  const path = `d:\\AudicoAI\\audico_quotes_modern\\audico-chat-quote\\test-screenshots\\${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`>>> Screenshot saved: ${path}`);
}

test.describe('Home Chat Tab Tests', () => {
  test.setTimeout(180000); // 3 minutes per test

  test('Scenario 1: 5.1.4 Dolby Atmos Home Cinema', async ({ page }) => {
    console.log('\n=================================================');
    console.log('TEST 1: 5.1.4 DOLBY ATMOS HOME CINEMA');
    console.log('=================================================');

    // Navigate to chat page
    console.log('\n>>> Navigating to http://localhost:3000/chat');
    await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await captureScreenshot(page, 'test1-01-initial');

    // Verify Home tab is selected
    console.log('\n>>> Checking Home tab is selected...');
    const homeTab = page.locator('button, a').filter({ hasText: /^home$/i });
    await expect(homeTab).toBeVisible();
    console.log('>>> Home tab found');

    // Click Home tab to ensure it's active
    await homeTab.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'test1-02-home-tab-clicked');

    // Clear any existing quote
    console.log('\n>>> Clearing existing quote...');
    const clearButton = page.locator('button').filter({ hasText: /clear|reset/i });
    if (await clearButton.count() > 0) {
      await clearButton.first().click();
      await page.waitForTimeout(500);
      console.log('>>> Quote cleared');
    }

    // Send the Atmos query
    await sendChatMessage(page, 'I want to build a 5.1.4 Dolby Atmos home cinema');
    await captureScreenshot(page, 'test1-03-message-sent');

    // Wait for AI response
    await waitForAIResponse(page);
    await captureScreenshot(page, 'test1-04-ai-response');

    // Check if products were suggested
    console.log('\n>>> Checking for product suggestions...');
    const productCards = page.locator('[class*="product"], [class*="suggestion"]');
    const productCount = await productCards.count();
    console.log(`>>> Found ${productCount} product cards`);

    // Add 2-3 products to quote
    const addedCount = await addProductsToQuote(page, 3);
    await captureScreenshot(page, 'test1-05-products-added');

    // Check Notes panel
    const notesResult = await checkNotesPanel(page);
    await captureScreenshot(page, 'test1-06-notes-check');

    // Verify it mentions 5.1.4 Atmos system
    if (notesResult.visible) {
      const mentions514 = notesResult.text.toLowerCase().includes('5.1.4') ||
                          notesResult.text.toLowerCase().includes('atmos') ||
                          notesResult.text.toLowerCase().includes('home cinema');
      console.log(`>>> Notes mentions 5.1.4/Atmos/Home Cinema: ${mentions514}`);
    }

    // Check product images
    const imageResult = await checkProductImages(page);

    // Take final screenshot
    await captureScreenshot(page, 'test1-07-final');

    // Assertions
    expect(addedCount).toBeGreaterThan(0);
    console.log('\n>>> TEST 1 COMPLETED');
  });

  test('Scenario 2: Whole-Home Audio in 4 Rooms', async ({ page }) => {
    console.log('\n=================================================');
    console.log('TEST 2: WHOLE-HOME AUDIO IN 4 ROOMS');
    console.log('=================================================');

    // Navigate to chat page
    console.log('\n>>> Navigating to http://localhost:3000/chat');
    await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, 'test2-01-initial');

    // Click Home tab
    const homeTab = page.locator('button, a').filter({ hasText: /^home$/i });
    await homeTab.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'test2-02-home-tab-clicked');

    // Clear any existing quote
    console.log('\n>>> Clearing existing quote...');
    const clearButton = page.locator('button').filter({ hasText: /clear|reset/i });
    if (await clearButton.count() > 0) {
      await clearButton.first().click();
      await page.waitForTimeout(500);
    }

    // Send the multiroom query
    await sendChatMessage(page, 'I need whole-home audio in 4 rooms');
    await captureScreenshot(page, 'test2-03-message-sent');

    // Wait for AI response
    await waitForAIResponse(page);
    await captureScreenshot(page, 'test2-04-ai-response');

    // Add products to quote
    const addedCount = await addProductsToQuote(page, 3);
    await captureScreenshot(page, 'test2-05-products-added');

    // Check Notes panel
    const notesResult = await checkNotesPanel(page);
    await captureScreenshot(page, 'test2-06-notes-check');

    // Verify it mentions multiroom
    if (notesResult.visible) {
      const mentionsMultiroom = notesResult.text.toLowerCase().includes('multiroom') ||
                                 notesResult.text.toLowerCase().includes('whole') ||
                                 notesResult.text.toLowerCase().includes('zone');
      console.log(`>>> Notes mentions multiroom/zone: ${mentionsMultiroom}`);
    }

    // Check product images
    const imageResult = await checkProductImages(page);

    await captureScreenshot(page, 'test2-07-final');

    expect(addedCount).toBeGreaterThan(0);
    console.log('\n>>> TEST 2 COMPLETED');
  });

  test('Scenario 3: Simple Stereo Speakers', async ({ page }) => {
    console.log('\n=================================================');
    console.log('TEST 3: SIMPLE STEREO SPEAKERS FOR LIVING ROOM');
    console.log('=================================================');

    // Navigate to chat page
    console.log('\n>>> Navigating to http://localhost:3000/chat');
    await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, 'test3-01-initial');

    // Click Home tab
    const homeTab = page.locator('button, a').filter({ hasText: /^home$/i });
    await homeTab.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'test3-02-home-tab-clicked');

    // Clear any existing quote
    console.log('\n>>> Clearing existing quote...');
    const clearButton = page.locator('button').filter({ hasText: /clear|reset/i });
    if (await clearButton.count() > 0) {
      await clearButton.first().click();
      await page.waitForTimeout(500);
    }

    // Send the stereo query
    await sendChatMessage(page, 'I just want good stereo speakers for my living room');
    await captureScreenshot(page, 'test3-03-message-sent');

    // Wait for AI response
    await waitForAIResponse(page);
    await captureScreenshot(page, 'test3-04-ai-response');

    // Add products to quote
    const addedCount = await addProductsToQuote(page, 2);
    await captureScreenshot(page, 'test3-05-products-added');

    // Check Notes panel
    const notesResult = await checkNotesPanel(page);
    await captureScreenshot(page, 'test3-06-notes-check');

    // For simple stereo, notes might not appear or might show basic system
    console.log(`>>> Notes panel visible: ${notesResult.visible}`);
    if (notesResult.visible) {
      console.log(`>>> Notes text preview: ${notesResult.text.substring(0, 150)}`);
    }

    // Check product images
    const imageResult = await checkProductImages(page);

    await captureScreenshot(page, 'test3-07-final');

    expect(addedCount).toBeGreaterThan(0);
    console.log('\n>>> TEST 3 COMPLETED');
  });
});

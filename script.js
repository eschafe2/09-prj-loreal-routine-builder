const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const searchInput = document.getElementById("searchInput");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

// Global conversation history
const messages = [
  {
    role: "system",
    content: `
You are a professional skincare and beauty product advisor specializing in L'Oréal portfolio brands including CeraVe, La Roche-Posay, Vichy, Lancôme, Urban Decay, Maybelline, and other L'Oréal owned brands.

When users ask about routines or products, provide helpful, detailed advice about:
- Skincare routines and product order
- Product benefits and ingredients
- Skin type recommendations
- How to use products effectively
- Compatibility between products

You should focus on the products available in our catalog and provide practical, actionable skincare advice. If someone asks about topics unrelated to skincare, beauty, or our product range, politely redirect them back to skincare and beauty topics.
`
  }
];

// Product data and selected products
let allProducts = [];
let selectedProducts = [];

// Load products data
async function loadProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('Failed to load products');
    const data = await response.json();
    allProducts = data.products;
    displayProducts(allProducts);
  } catch (error) {
    console.error('Error loading products:', error);
    productsContainer.innerHTML = '<p class="error-message">Failed to load products. Please refresh the page.</p>';
  }
}

// Display products in the grid
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = '<p class="no-results">No products found matching your search.</p>';
    return;
  }

  productsContainer.innerHTML = products.map(function(product) {
    return `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" onerror="this.src='img/placeholder.png'">
      <div class="product-info">
        <h3>${product.brand} ${product.name}</h3>
        <p class="category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</p>
        <p class="description">${truncateText(product.description, 80)}</p>
        <button class="select-product-btn" onclick="toggleProductSelection(${product.id})">
          ${selectedProducts.some(function(p) { return p.id === product.id; }) ? 'Remove' : 'Select'}
        </button>
      </div>
    </div>
  `;
  }).join('');
}

// Truncate text for display
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Filter products based on search
function filterProducts(searchTerm) {
  if (!searchTerm.trim()) {
    return allProducts;
  }
  
  var term = searchTerm.toLowerCase();
  return allProducts.filter(function(product) {
    return product.name.toLowerCase().includes(term) ||
           product.brand.toLowerCase().includes(term) ||
           product.category.toLowerCase().includes(term) ||
           product.description.toLowerCase().includes(term);
  });
}

// Toggle product selection
function toggleProductSelection(productId) {
  var product = allProducts.find(function(p) { return p.id === productId; });
  if (!product) return;

  var existingIndex = selectedProducts.findIndex(function(p) { return p.id === productId; });
  
  if (existingIndex > -1) {
    // Remove product
    selectedProducts.splice(existingIndex, 1);
  } else {
    // Add product
    selectedProducts.push(product);
  }
  
  updateSelectedProductsDisplay();
  // Refresh the products grid to update button states
  displayProducts(filterProducts(searchInput.value));
}

// Update selected products display
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = '<p class="no-selection">No products selected yet.</p>';
    generateRoutineBtn.disabled = true;
    generateRoutineBtn.textContent = 'Select Products First';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts.map(function(product) {
    return `
    <div class="selected-product-tag">
      <span>${product.brand} ${product.name}</span>
      <button class="remove-product" onclick="toggleProductSelection(${product.id})" title="Remove product">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>
  `;
  }).join('');

  generateRoutineBtn.disabled = false;
  generateRoutineBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';
}

// Search event listener
searchInput.addEventListener('input', function(e) {
  var searchTerm = e.target.value;
  var filteredProducts = filterProducts(searchTerm);
  displayProducts(filteredProducts);
});

// Generate routine functionality
generateRoutineBtn.addEventListener('click', function() {
  if (selectedProducts.length === 0) return;
  
  var productNames = selectedProducts.map(function(p) { return p.brand + ' ' + p.name; }).join(', ');
  var routineMessage = 'Please create a skincare routine using these products: ' + productNames;
  
  // Add to chat
  appendMessage("user", routineMessage);
  messages.push({ role: "user", content: routineMessage });
  
  // Process through AI
  handleAIResponse();
});

// Convert markdown-style formatting to HTML
function formatMarkdown(text) {
  if (!text) return text;
  
  // Convert **bold** to <strong>bold</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>italic</em>
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert numbered lists (1. item) to proper HTML lists
  text = text.replace(/^(\d+)\.\s(.+)/gm, '<li>$2</li>');
  
  // Convert bullet points (- item) to proper HTML lists
  text = text.replace(/^[-*]\s(.+)/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> items in <ul> tags
  text = text.replace(/(<li>.*<\/li>)/gs, function(match) {
    return '<ul>' + match + '</ul>';
  });
  
  // Clean up multiple consecutive <ul> tags
  text = text.replace(/<\/ul>\s*<ul>/g, '');
  
  // Convert line breaks to <br> tags
  text = text.replace(/\n/g, '<br>');
  
  return text;
}

// Initial greeting
appendMessage("ai", "👋 Hello! How can I help you today? You can search for products above and select them to build a routine!");

// Chat form handler
chatForm.addEventListener("submit", function(e) {
  e.preventDefault();
  var message = userInput.value.trim();
  if (!message) return;

  // Show user message
  appendMessage("user", message);
  messages.push({ role: "user", content: message });

  // Clear input
  userInput.value = "";

  handleAIResponse();
});

// Handle AI response
async function handleAIResponse() {
  try {
    const response = await fetch("https://314159265.nchlsschfr.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content?.trim() || "⚠️ No response from AI.";

    // Show AI message with formatting
    appendMessage("ai", aiMessage);
    messages.push({ role: "assistant", content: aiMessage });
  } catch (error) {
    appendMessage("ai", `⚠️ Error: ${error.message}`);
    console.error(error);
  }
}

// Append message function with markdown formatting support
function appendMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  
  if (role === "ai") {
    // Apply markdown formatting for AI messages
    msg.innerHTML = formatMarkdown(text);
  } else {
    // Keep user messages as plain text
    msg.textContent = text;
  }
  
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  loadProducts();
});

// Make toggleProductSelection global for inline onclick handlers
window.toggleProductSelection = toggleProductSelection;
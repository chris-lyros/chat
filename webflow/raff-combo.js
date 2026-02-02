// State management
let currentPanel = null;
let hasRecommendedModel = false;
let monthlyTokenUsage = { input: 142350, output: 89230 }; // Track total monthly usage
let monthlyBudget = 19.99;

const creativityLabels = {
    getRangeLabel: (value) => {
        if (value <= 1) return 'Robotic (Literal)';
        if (value <= 2) return 'Calculated (Precise)';
        if (value <= 3) return 'Measured (Conservative)';
        if (value <= 4) return 'Sensible (Grounded)';
        if (value <= 5) return 'Default (Balanced)';
        if (value <= 6) return 'Playful (Expressive)';
        if (value <= 7) return 'Adventurous (Bold)';
        if (value <= 8) return 'Wild (Experimental)';
        if (value <= 9) return 'Unhinged (Chaotic)';
        return 'Absolutely Feral (Maximum Chaos)';
    }
};

const formalityLabels = {
    getRangeLabel: (value) => {
        if (value <= 1) return 'Unhinged Gremlin';
        if (value <= 2) return 'Teenager Texting';
        if (value <= 3) return 'Meme Lord';
        if (value <= 4) return 'Text Message';
        if (value <= 5) return 'Normal Human';
        if (value <= 6) return 'Coffee Chat';
        if (value <= 7) return 'Business Email';
        if (value <= 8) return 'LinkedIn Professional';
        if (value <= 9) return 'Corporate Jargon';
        return 'Shakespearean Butler';
    }
};

// Model switching logic - Define BEFORE initialization
const modelsBySupplier = {
    'gemini': [
        { value: 'gemini-2.0-flash', cost: 0.10, name: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-flash', cost: 0.15, name: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-pro', cost: 2.50, name: 'Gemini 1.5 Pro' }
    ],
    'openai': [
        { value: 'gpt-4o-mini', cost: 0.60, name: 'GPT-4o Mini' },
        { value: 'gpt-4-turbo', cost: 3.00, name: 'GPT-4 Turbo' },
        { value: 'gpt-4o', cost: 5.00, name: 'GPT-4o' }
    ],
    'anthropic': [
        { value: 'claude-haiku-4', cost: 0.80, name: 'Claude Haiku 4' },
        { value: 'claude-sonnet-3.5', cost: 3.00, name: 'Claude Sonnet 3.5' },
        { value: 'claude-sonnet-4.5', cost: 3.00, name: 'Claude Sonnet 4.5' },
        { value: 'claude-opus-4', cost: 15.00, name: 'Claude Opus 4' }
    ],
    'meta': [
        { value: 'llama-3.3-70b', cost: 0.35, name: 'Llama 3.3 70B' },
        { value: 'llama-3.1-405b', cost: 0.80, name: 'Llama 3.1 405B' }
    ],
    'mistral': [
        { value: 'mixtral-8x7b', cost: 0.24, name: 'Mixtral 8x7B' },
        { value: 'mistral-large', cost: 0.30, name: 'Mistral Large' }
    ],
    'xai': [
        { value: 'grok-2-mini', cost: 2.00, name: 'Grok-2 Mini' },
        { value: 'grok-beta', cost: 5.00, name: 'Grok Beta' },
        { value: 'grok-2', cost: 10.00, name: 'Grok-2' }
    ]
};

// Initialize
updateCreativityLabel();
updateFormalityLabel();
updateModelInfo();
updateRecommendedModel();
checkBudgetWarning();

// PII Toggle Handler
function handlePIIToggle(checkbox) {
    if (!checkbox.checked) {
        const confirmed = confirm(
            "⚠️ Warning: Disabling PII Redaction\n\n" +
            "Without PII redaction, sensitive information like:\n" +
            "• Names and personal identifiers\n" +
            "• Email addresses and phone numbers\n" +
            "• Business-sensitive data\n\n" +
            "...will be sent directly to third-party LLM providers.\n\n" +
            "This may violate privacy policies or expose confidential information.\n\n" +
            "Are you sure you want to disable PII redaction?"
        );
        
        if (!confirmed) {
            checkbox.checked = true;
        }
    }
}

function updateRecommendedModel() {
    const select = document.getElementById('modelSelect');
    const currentOption = select.options[select.selectedIndex];
    const currentSupplier = currentOption.dataset.supplier;
    const currentCost = parseFloat(currentOption.dataset.cost);
    
    const warningElement = document.getElementById('budgetWarningSpend');
    
    // If we're at the cheapest model overall
    if (currentCost === 0.10) {
        if (warningElement && calculateMonthlyProjection() > monthlyBudget) {
            warningElement.innerHTML = `<span style="color: #fca5a5; font-size: 0.875rem; line-height: 1.5;">
                ⚠️ On track to exceed budget by $${(calculateMonthlyProjection() - monthlyBudget).toFixed(2)}.<br>
                💡 Already using the cheapest model. Consider reducing usage or increasing your budget below.
            </span>`;
            warningElement.style.display = 'block';
        }
        return;
    }
    
    // If we already recommended and switched, don't recommend again
    if (hasRecommendedModel && calculateMonthlyProjection() <= monthlyBudget) {
        if (warningElement) {
            warningElement.style.display = 'none';
        }
        return;
    }
    
    // Find next cheaper model from same supplier
    const supplierModels = modelsBySupplier[currentSupplier];
    let recommended = null;
    
    for (let model of supplierModels) {
        if (model.cost < currentCost) {
            recommended = model;
            break;
        }
    }
    
    // If no cheaper model from same supplier, recommend cheapest overall
    if (!recommended) {
        recommended = { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' };
    }
    
    const recommendedSpan = document.getElementById('recommendedModel');
    if (recommendedSpan) {
        recommendedSpan.textContent = recommended.name;
        recommendedSpan.dataset.value = recommended.value;
    }
    
    // Show or hide warning based on budget
    if (warningElement && calculateMonthlyProjection() > monthlyBudget) {
        warningElement.innerHTML = `<span style="color: #fca5a5; font-size: 0.875rem; line-height: 1.5;">
            ⚠️ On track to exceed budget by $${(calculateMonthlyProjection() - monthlyBudget).toFixed(2)}.<br>
            <button onclick="switchToRecommendedModel()" style="background: none; border: none; color: var(--accent-color); text-decoration: underline; cursor: pointer; padding: 0; margin-top: 0.5rem; font-size: 0.875rem;">Consider switching to <span id="recommendedModel">${recommended.name}</span></button>
        </span>`;
        warningElement.style.display = 'block';
    } else if (warningElement) {
        warningElement.style.display = 'none';
    }
}

function switchToRecommendedModel() {
    const recommendedSpan = document.getElementById('recommendedModel');
    const recommendedValue = recommendedSpan.dataset.value;
    
    const select = document.getElementById('modelSelect');
    const currentOption = select.options[select.selectedIndex];
    const currentCost = parseFloat(currentOption.dataset.cost);
    
    // Check if we're already at the cheapest model
    if (currentCost === 0.10) {
        alert('💡 You\'re already using the most cost-effective model (Gemini 2.0 Flash).\n\nTo reduce spending:\n• Reduce usage frequency\n• Disable "Hmm" (thinking) mode when not needed\n• Increase your monthly budget in the field below');
        return;
    }
    
    select.value = recommendedValue;
    hasRecommendedModel = true;
    
    updateModelInfo();
    updateRecommendedModel();
    
    // Update warning display
    const warningElement = document.getElementById('budgetWarningSpend');
    const projectedSpend = calculateMonthlyProjection();
    
    if (projectedSpend <= monthlyBudget) {
        if (warningElement) {
            warningElement.innerHTML = `<span style="color: var(--accent-color);">✅ On track! Projected spend now within budget.</span>`;
            setTimeout(() => {
                warningElement.style.display = 'none';
            }, 3000);
        }
        alert(`✅ Switched to ${recommendedSpan.textContent}! You're now on track to stay within budget.`);
    } else {
        alert(`✅ Switched to ${recommendedSpan.textContent}! This will help reduce your spending.`);
    }
}

// Panel management
function togglePanel(panelName) {
    const panel = document.getElementById(panelName + 'Panel');
    const chatArea = document.getElementById('chatArea');
    
    if (currentPanel === panelName) {
        closePanel(panelName);
    } else {
        // Close other panel if open
        if (currentPanel) {
            closePanel(currentPanel);
        }
        
        panel.classList.add('open');
        if (window.innerWidth > 768) {
            chatArea.classList.add('panel-open');
        }
        currentPanel = panelName;
    }
}

function closePanel(panelName) {
    const panel = document.getElementById(panelName + 'Panel');
    const chatArea = document.getElementById('chatArea');
    
    panel.classList.remove('open');
    chatArea.classList.remove('panel-open');
    currentPanel = null;
}

// Creativity slider
function updateCreativityLabel() {
    const slider = document.getElementById('creativitySlider');
    const label = document.getElementById('creativityLabel');
    const value = parseFloat(slider.value);
    label.textContent = creativityLabels.getRangeLabel(value);
}

// Formality slider
function updateFormalityLabel() {
    const slider = document.getElementById('formalitySlider');
    const label = document.getElementById('formalityLabel');
    const value = parseFloat(slider.value);
    label.textContent = formalityLabels.getRangeLabel(value);
}

// Budget warning checker
function checkBudgetWarning() {
    const warning = document.getElementById('budgetWarning');
    const currentSpend = calculateMonthlyProjection();
    
    if (currentSpend > monthlyBudget) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

// Calculate monthly projection based on current model
function calculateMonthlyProjection() {
    const select = document.getElementById('modelSelect');
    const selectedOption = select.options[select.selectedIndex];
    const costPer1M = parseFloat(selectedOption.dataset.cost);
    
    const totalTokens = monthlyTokenUsage.input + monthlyTokenUsage.output;
    const costPerToken = costPer1M / 1000000;
    const monthlySpend = totalTokens * costPerToken;
    
    // Project for full month (28 days) based on 2 days usage
    return (monthlySpend / 2) * 28;
}

// Model info updater
function updateModelInfo() {
    const select = document.getElementById('modelSelect');
    const selectedOption = select.options[select.selectedIndex];
    const strength = selectedOption.dataset.strength;
    
    const indicator = document.getElementById('modelStrength');
    indicator.textContent = `Best for: ${strength}`;
    
    // Update recommended model when current model changes
    updateRecommendedModel();
    
    // Update projected spending
    updateProjectedSpending();
    
    // Check budget warning
    checkBudgetWarning();
}

// Update projected spending display
function updateProjectedSpending() {
    const projectedSpend = calculateMonthlyProjection();
    const projectedElement = document.getElementById('projectedAmount');
    const warningElement = document.getElementById('budgetWarningSpend');
    
    if (projectedElement) {
        if (projectedSpend <= monthlyBudget) {
            projectedElement.style.color = 'var(--accent-color)';
            projectedElement.textContent = `$${projectedSpend.toFixed(2)}`;
            
            // Hide warning if under budget
            if (warningElement) {
                warningElement.style.display = 'none';
            }
        } else {
            projectedElement.style.color = '#f87171';
            projectedElement.textContent = `$${projectedSpend.toFixed(2)}`;
            
            // Show warning if over budget and haven't recommended yet
            if (warningElement && !hasRecommendedModel) {
                warningElement.style.display = 'block';
            }
        }
    }
}

// Message handling
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Hide welcome, show messages
    document.getElementById('welcomeSection').style.display = 'none';
    document.getElementById('messages').style.display = 'block';
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const model = document.getElementById('modelSelect').value;
        const creativityValue = parseFloat(document.getElementById('creativitySlider').value).toFixed(1);
        const creativityLabel = creativityLabels.getRangeLabel(parseFloat(creativityValue));
        const formalityValue = parseFloat(document.getElementById('formalitySlider').value).toFixed(1);
        const formalityLabel = formalityLabels.getRangeLabel(parseFloat(formalityValue));
        const ignoreMemory = document.getElementById('ignoreMemory').checked;
        
        let response = `I'm responding using ${model} with ${creativityLabel} creativity (${creativityValue}/10) and ${formalityLabel} formality (${formalityValue}/10).`;
        
        if (ignoreMemory) {
            response += ' (Memory ignored for this response)';
        }
        
        addMessage(response, 'assistant');
    }, 1000);
}

function addMessage(text, role) {
    const messages = document.getElementById('messages');
    const message = document.createElement('div');
    message.className = `message ${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Panel chat handling
function sendPanelMessage(panelType) {
    const input = document.getElementById(panelType + 'ChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Simulate response (using cheapest model - Gemini 2.0 Flash)
    setTimeout(() => {
        if (panelType === 'spend') {
            alert('Spend assistant (Gemini 2.0 Flash): ' + getSpendResponse(message));
        } else {
            alert('Memory assistant (Gemini 2.0 Flash): ' + getMemoryResponse(message));
        }
    }, 500);
    
    input.value = '';
}

function handlePanelKeyPress(event, panelType) {
    if (event.key === 'Enter') {
        sendPanelMessage(panelType);
    }
}

function getSpendResponse(message) {
    if (message.toLowerCase().includes('save')) {
        return "To save money, consider switching to budget-tier models like Gemini 2.0 Flash ($0.10/1M) or Mixtral 8x7B ($0.24/1M). Disable 'Thinking' mode when not needed as it roughly doubles token usage.";
    }
    return "I can help you understand your spending, optimize model selection, and manage your budget. What would you like to know?";
}

function getMemoryResponse(message) {
    if (message.toLowerCase().includes('update') || message.toLowerCase().includes('change')) {
        return "I'll update your memory with that information. Memory changes take effect immediately and apply to all future conversations.";
    }
    return "I can help you view, update, or delete memory entries. Your memory helps me provide personalized responses while keeping chat history separate to avoid bias.";
}

function updateBudget(value) {
    monthlyBudget = parseFloat(value);
    hasRecommendedModel = false; // Reset recommendation flag when budget changes
    updateModelInfo(); // Recalculate everything
    console.log('Budget updated to: $' + value);
}

// Handle window resize
window.addEventListener('resize', () => {
    const chatArea = document.getElementById('chatArea');
    if (window.innerWidth <= 768) {
        chatArea.classList.remove('panel-open');
    } else if (currentPanel) {
        chatArea.classList.add('panel-open');
    }
});

// ========================================
// DOG PHOTO ROTATION - LOGO & PANELS
// ========================================

// Logo rotation with your dog photos
const logoDogPhotos = [
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog1.jpg', // Beach house
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog2.jpg', // Beach wet
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog3.jpg', // Park
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog4.jpg', // Office selfie
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog5.jpg', // Pink couch
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog6.jpg', // Sunset beach
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog7.jpg', // Sleeping cuddle
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog8.jpg'  // Cuddle basket
];

// Panel badge photos
const badgePhotos = [
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog4.jpg',
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog3.jpg',
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog1.jpg',
    'https://cdn.jsdelivr.net/gh/chris-lyros/chat@main/webflow/images/dog2.jpg'
];

let currentLogoIndex = 0;
let currentBadgeIndex = 0;

// Rotate logo photo
function rotateLogoPhoto() {
    const logoImg = document.getElementById('logoImage');
    if (logoImg) {
        currentLogoIndex = (currentLogoIndex + 1) % logoDogPhotos.length;
        logoImg.style.opacity = '0';
        
        setTimeout(() => {
            logoImg.src = logoDogPhotos[currentLogoIndex];
            logoImg.style.opacity = '1';
        }, 300);
    }
}

// Rotate panel badge
function rotatePanelBadge(badgeId) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.style.opacity = '0';
        badge.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            currentBadgeIndex = (currentBadgeIndex + 1) % badgePhotos.length;
            badge.src = badgePhotos[currentBadgeIndex];
            
            setTimeout(() => {
                badge.style.opacity = '1';
                badge.style.transform = 'scale(1)';
            }, 50);
        }, 300);
    }
}

// Initialize smooth fade transition for logo
const logoImg = document.getElementById('logoImage');
if (logoImg) {
    logoImg.style.transition = 'opacity 0.3s ease';
}

// Add smooth transition to badges
const badges = document.querySelectorAll('.panel-dog-badge');
badges.forEach(badge => {
    badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
});

// Rotate logo every 4 seconds
setInterval(rotateLogoPhoto, 4000);

// Rotate panel badges every 8 seconds
setInterval(() => {
    rotatePanelBadge('memsPanelBadge');
    rotatePanelBadge('aboutPanelBadge');
}, 8000);

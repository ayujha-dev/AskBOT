/**
 * TokenCounter: Heuristic token estimation & context sliding-window trimmer.
 */

export class TokenCounter {
  /**
   * Estimate token count for a raw string.
   * Standard rule of thumb: ~4 characters per token in English.
   * @param {string} text
   * @returns {number}
   */
  static estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;

    // Character length heuristic with whitespace and punctuation weight
    const charCount = trimmed.length;
    const words = trimmed.split(/\s+/).length;

    // Blend character count (~4 chars/token) with word count (~1.3 tokens/word)
    const tokenEstFromChars = Math.ceil(charCount / 3.8);
    const tokenEstFromWords = Math.ceil(words * 1.3);

    return Math.max(1, Math.round((tokenEstFromChars + tokenEstFromWords) / 2));
  }

  /**
   * Estimate tokens for a single message object, including attachments.
   * @param {Object} message
   * @returns {number}
   */
  static estimateMessageTokens(message) {
    let tokens = 4; // Base message framing overhead (<|im_start|>role\n ... <|im_end|>)

    if (message.content) {
      tokens += this.estimateTokens(message.content);
    }

    if (Array.isArray(message.attachments)) {
      for (const att of message.attachments) {
        if (att.type === 'image') {
          // Standard high-res vision tile heuristic (~800 - 1000 tokens)
          tokens += 800;
        } else if (att.type === 'text' && att.data) {
          tokens += this.estimateTokens(att.data) + 10;
        }
      }
    }

    return tokens;
  }

  /**
   * Estimate total tokens across a full message array.
   * @param {Array<Object>} messages
   * @returns {number}
   */
  static estimateMessagesTokens(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return 0;
    let total = 3; // Initial priming overhead

    for (const msg of messages) {
      total += this.estimateMessageTokens(msg);
    }

    return total;
  }

  /**
   * Trims message history to fit within contextBudgetTokens.
   * Invariant 1: Always preserves system instruction if present.
   * Invariant 2: Always preserves the latest user message.
   * Invariant 3: Trims oldest messages first.
   * @param {Array<Object>} messages
   * @param {number} budgetTokens
   * @returns {Array<Object>}
   */
  static trimToContextBudget(messages, budgetTokens) {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    if (!budgetTokens || budgetTokens <= 0) return messages;

    const currentTotal = this.estimateMessagesTokens(messages);
    if (currentTotal <= budgetTokens) {
      return [...messages];
    }

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    if (conversationMessages.length <= 1) {
      return [...messages];
    }

    let trimmedConversation = [...conversationMessages];

    // Progressively remove from the beginning of conversationMessages
    while (trimmedConversation.length > 1) {
      // Ensure candidate starts with a user turn
      while (trimmedConversation.length > 1 && trimmedConversation[0].role === 'assistant') {
        trimmedConversation.shift();
      }

      const candidateList = [...systemMessages, ...trimmedConversation];
      if (this.estimateMessagesTokens(candidateList) <= budgetTokens) {
        return candidateList;
      }
      trimmedConversation.shift();
    }

    // Ensure final trimmed slice starts with user turn if possible
    while (trimmedConversation.length > 1 && trimmedConversation[0].role === 'assistant') {
      trimmedConversation.shift();
    }

    return [...systemMessages, ...trimmedConversation];
  }
}

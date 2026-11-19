/**
 * SuggestionsComponent: Dynamic time-of-day greeting and 4 randomized suggestion chips.
 */

export const PROMPT_LIBRARY = [
  {
    title: 'Plot trigonometric waves in Python',
    subtitle: 'Code & Pyodide execution',
    prompt: 'Write Python code using numpy and matplotlib to plot sine and cosine waves side-by-side with a dark theme.',
    mode: 'code'
  },
  {
    title: 'Explain Quantum Key Distribution (QKD)',
    subtitle: 'Deep conceptual breakdown',
    prompt: 'Explain Quantum Key Distribution (BB84 protocol) using simple physical analogies and cryptographic principles.',
    mode: 'standard'
  },
  {
    title: 'Debug React useEffect infinite re-render',
    subtitle: 'Frontend architectural bugfix',
    prompt: 'Why does an object dependency in React useEffect cause infinite re-renders? Show both incorrect and fixed patterns.',
    mode: 'code'
  },
  {
    title: 'Design a clean token-bucket rate limiter',
    subtitle: 'System design & backend logic',
    prompt: 'Design a high-throughput distributed token-bucket rate limiter. Outline concurrency safety, Redis data structures, and edge cases.',
    mode: 'standard'
  },
  {
    title: 'Latest developments in fusion energy',
    subtitle: 'Search grounding & citations',
    prompt: 'What are the most notable recent milestones in nuclear fusion energy research? Provide key citations and timelines.',
    mode: 'search'
  },
  {
    title: 'Compare PostgreSQL vs ClickHouse for analytics',
    subtitle: 'Database trade-off analysis',
    prompt: 'Provide a structured comparison between PostgreSQL (with TimescaleDB) and ClickHouse for columnar analytical queries.',
    mode: 'standard'
  },
  {
    title: 'Simulate Monte Carlo stock price paths',
    subtitle: 'Quantitative simulation in Python',
    prompt: 'Generate 50 Monte Carlo paths of geometric Brownian motion for asset pricing in Python and display the distribution plot.',
    mode: 'code'
  },
  {
    title: 'Brainstorm high-converting SaaS landing page hooks',
    subtitle: 'Copywriting & positioning',
    prompt: 'Brainstorm 5 sharp, anti-cliché value proposition headlines for an AI developer tool that runs 100% locally in the browser.',
    mode: 'standard'
  }
];

export class SuggestionsComponent {
  constructor(onSelectPrompt) {
    this.onSelectPrompt = onSelectPrompt;
    this.greetingHeading = document.getElementById('greeting-heading');
    this.chipsGrid = document.getElementById('suggestion-chips-grid');

    this.render();
  }

  static getGreeting(hour = new Date().getHours()) {
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }

  static getRandomSuggestions(count = 4) {
    const shuffled = [...PROMPT_LIBRARY].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  render(animate = true) {
    const greetingText = SuggestionsComponent.getGreeting();

    if (this.greetingHeading) {
      if (animate && typeof window !== 'undefined' && typeof document !== 'undefined') {
        this.greetingHeading.innerHTML = '';
        const textSpan = document.createElement('span');
        const cursorSpan = document.createElement('span');
        cursorSpan.className = 'greeting-cursor';
        this.greetingHeading.appendChild(textSpan);
        this.greetingHeading.appendChild(cursorSpan);

        let i = 0;
        const charDelay = Math.max(25, Math.floor(450 / greetingText.length));
        const typeNext = () => {
          if (i < greetingText.length) {
            textSpan.textContent += greetingText.charAt(i);
            i++;
            setTimeout(typeNext, charDelay);
          } else {
            setTimeout(() => {
              if (cursorSpan && cursorSpan.parentElement) {
                cursorSpan.style.opacity = '0.5';
              }
            }, 1000);
          }
        };
        typeNext();
      } else {
        this.greetingHeading.textContent = greetingText;
      }
    }

    if (!this.chipsGrid) return;
    this.chipsGrid.innerHTML = '';

    const suggestions = SuggestionsComponent.getRandomSuggestions(4);

    suggestions.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'suggestion-card-enter group p-3.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-panel)] hover:bg-[var(--surface-panel-hover)] hover:border-[var(--accent-blue)] cursor-pointer ui-spring shadow-sm flex flex-col justify-between';
      card.style.animationDelay = `${idx * 70}ms`;

      card.innerHTML = `
        <div class="mb-2">
          <h3 class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] ui-transition leading-snug">
            ${item.title}
          </h3>
          <p class="text-[11px] text-[var(--text-muted)] mt-0.5">${item.subtitle}</p>
        </div>
        <div class="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1">
          <span class="capitalize">${item.mode}</span>
          <svg class="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-blue)] ui-transition"><use href="#icon-chevron-down" transform="rotate(-90 12 12)"/></svg>
        </div>
      `;

      card.addEventListener('click', () => {
        if (this.onSelectPrompt) {
          this.onSelectPrompt(item.prompt, item.mode);
        }
      });

      this.chipsGrid.appendChild(card);
    });
  }
}

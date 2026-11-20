import { FileReaderUtil } from '../../utils/file-reader.js';

export class FileManager {
  constructor(options = {}) {
    this.attachments = [];
    this.onAttachmentsChange = options.onAttachmentsChange || (() => {});

    this.trayEl = document.getElementById('attachment-preview-tray');
    this.fileInput = document.getElementById('file-input');
    this.btnAttach = document.getElementById('btn-attach-file');
    this.composerBox = document.getElementById('chat-composer');
    this.textarea = document.getElementById('composer-textarea');

    this.init();
  }

  init() {
    if (this.btnAttach && this.fileInput) {
      this.btnAttach.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          await this.handleFiles(Array.from(e.target.files));
          this.fileInput.value = '';
        }
      });
    }

    // Drag & Drop onto composer
    if (this.composerBox) {
      this.composerBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.composerBox.classList.add('border-[var(--accent-blue)]');
      });

      this.composerBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.composerBox.classList.remove('border-[var(--accent-blue)]');
      });

      this.composerBox.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.composerBox.classList.remove('border-[var(--accent-blue)]');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await this.handleFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Clipboard paste event: allows pasting images, screenshots, videos, or code files from clipboard
    document.addEventListener('paste', async (e) => {
      // If user is focused on a different text input/search, do not intercept text
      const activeEl = document.activeElement;
      const isInput = activeEl && activeEl.tagName === 'INPUT';
      const isOtherTextarea = activeEl && activeEl.tagName === 'TEXTAREA' && activeEl.id !== 'composer-textarea';
      if (isInput || isOtherTextarea) return;

      const clipboard = e.clipboardData;
      if (!clipboard) return;

      const filesToHandle = [];

      // Check for file items in clipboard
      if (clipboard.files && clipboard.files.length > 0) {
        for (let i = 0; i < clipboard.files.length; i++) {
          filesToHandle.push(clipboard.files[i]);
        }
      }

      if (clipboard.items && clipboard.items.length > 0) {
        for (let i = 0; i < clipboard.items.length; i++) {
          const item = clipboard.items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && !filesToHandle.some(f => f.name === file.name && f.size === file.size)) {
              filesToHandle.push(file);
            }
          }
        }
      }

      if (filesToHandle.length > 0) {
        // Intercept paste to attach file rather than dumping binary text
        e.preventDefault();
        await this.handleFiles(filesToHandle);
      }
    });
  }

  async handleFiles(files) {
    for (const file of files) {
      try {
        const attachment = await FileReaderUtil.readFile(file);
        this.attachments.push(attachment);
      } catch (err) {
        alert(err.message);
      }
    }
    this.render();
    this.onAttachmentsChange(this.attachments);
  }

  removeAttachment(index) {
    this.attachments.splice(index, 1);
    this.render();
    this.onAttachmentsChange(this.attachments);
  }

  clear() {
    this.attachments = [];
    this.render();
    this.onAttachmentsChange(this.attachments);
  }

  getAttachments() {
    return [...this.attachments];
  }

  render() {
    if (!this.trayEl) return;
    this.trayEl.innerHTML = '';

    if (this.attachments.length === 0) {
      this.trayEl.classList.add('hidden');
      return;
    }

    this.trayEl.classList.remove('hidden');

    this.attachments.forEach((att, index) => {
      const chip = document.createElement('div');
      chip.className = 'flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--surface-panel)] border border-[var(--surface-border)] text-xs text-[var(--text-primary)] max-w-xs truncate shadow-sm';

      if (att.type === 'image') {
        const img = document.createElement('img');
        img.src = att.data;
        img.alt = att.name;
        img.className = 'w-5 h-5 rounded object-cover flex-shrink-0';
        chip.appendChild(img);
      } else if (att.type === 'video') {
        const vidBadge = document.createElement('div');
        vidBadge.className = 'w-5 h-5 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[9px] flex-shrink-0';
        vidBadge.textContent = '▶';
        chip.appendChild(vidBadge);
      } else {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'w-4 h-4 text-[var(--accent-blue)] flex-shrink-0 font-mono text-[10px] font-bold flex items-center justify-center';
        iconSpan.textContent = att.name.split('.').pop()?.toUpperCase() || 'TXT';
        chip.appendChild(iconSpan);
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'truncate max-w-[120px] text-[11px]';
      nameSpan.textContent = att.name;
      chip.appendChild(nameSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'p-0.5 rounded-full hover:bg-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] ui-transition';
      removeBtn.innerHTML = '<svg class="w-3 h-3"><use href="#icon-close"/></svg>';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeAttachment(index);
      });
      chip.appendChild(removeBtn);

      this.trayEl.appendChild(chip);
    });
  }
}

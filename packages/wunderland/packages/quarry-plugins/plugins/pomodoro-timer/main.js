/**
 * Pomodoro Timer Plugin for FABRIC Codex
 * 
 * A focus timer widget implementing the Pomodoro Technique.
 * - 25 minute work sessions
 * - 5 minute short breaks
 * - 15 minute long breaks after 4 sessions
 */

class PomodoroTimerPlugin {
  constructor(api) {
    this.api = api
    this.state = {
      mode: 'work', // 'work' | 'break' | 'longBreak'
      timeRemaining: 0,
      isRunning: false,
      sessionsCompleted: 0,
      totalFocusTime: 0,
    }
    this.timerInterval = null
    this.container = null
  }

  async onEnable() {
    // Register the sidebar widget
    this.api.registerSidebarWidget({
      id: 'pomodoro-widget',
      render: (container) => this.render(container),
    })

    // Register keyboard commands
    this.api.registerCommand({
      id: 'pomodoro-start',
      name: 'Start/Pause Pomodoro',
      hotkey: 'Alt+P',
      callback: () => this.toggleTimer(),
    })

    this.api.registerCommand({
      id: 'pomodoro-reset',
      name: 'Reset Pomodoro',
      hotkey: 'Alt+Shift+P',
      callback: () => this.resetTimer(),
    })

    // Initialize timer
    this.resetTimer()
    
    this.api.showNotice('Pomodoro Timer enabled! Press Alt+P to start.')
  }

  async onDisable() {
    this.stopTimer()
    this.api.showNotice('Pomodoro Timer disabled.')
  }

  render(container) {
    this.container = container
    this.updateUI()
  }

  updateUI() {
    if (!this.container) return

    const settings = this.api.getSettings()
    const accentColor = settings.accentColor || '#ef4444'
    const minutes = Math.floor(this.state.timeRemaining / 60)
    const seconds = this.state.timeRemaining % 60
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    const modeLabels = {
      work: '🍅 Focus',
      break: '☕ Break',
      longBreak: '🌴 Long Break',
    }

    const totalDuration = this.getTotalDuration()
    const progress = totalDuration > 0 ? ((totalDuration - this.state.timeRemaining) / totalDuration) * 100 : 0

    this.container.innerHTML = `
      <div class="pomodoro-timer" style="--accent: ${accentColor}">
        <div class="pomodoro-header">
          <span class="pomodoro-mode">${modeLabels[this.state.mode]}</span>
          <span class="pomodoro-sessions">${this.state.sessionsCompleted} sessions</span>
        </div>
        
        <div class="pomodoro-display">
          <div class="pomodoro-progress" style="--progress: ${progress}%"></div>
          <div class="pomodoro-time">${timeDisplay}</div>
        </div>
        
        <div class="pomodoro-controls">
          <button class="pomodoro-btn pomodoro-btn-primary" data-action="toggle">
            ${this.state.isRunning ? '⏸ Pause' : '▶ Start'}
          </button>
          <button class="pomodoro-btn" data-action="reset">↺ Reset</button>
          <button class="pomodoro-btn" data-action="skip">⏭ Skip</button>
        </div>
        
        <div class="pomodoro-stats">
          <span>Total focus: ${Math.floor(this.state.totalFocusTime / 60)}m</span>
        </div>
      </div>
    `

    // Attach event listeners
    this.container.querySelector('[data-action="toggle"]').onclick = () => this.toggleTimer()
    this.container.querySelector('[data-action="reset"]').onclick = () => this.resetTimer()
    this.container.querySelector('[data-action="skip"]').onclick = () => this.skipSession()
  }

  getTotalDuration() {
    const settings = this.api.getSettings()
    switch (this.state.mode) {
      case 'work': return (settings.workDuration || 25) * 60
      case 'break': return (settings.breakDuration || 5) * 60
      case 'longBreak': return (settings.longBreakDuration || 15) * 60
      default: return 25 * 60
    }
  }

  toggleTimer() {
    if (this.state.isRunning) {
      this.stopTimer()
    } else {
      this.startTimer()
    }
  }

  startTimer() {
    if (this.state.isRunning) return
    
    this.state.isRunning = true
    this.timerInterval = setInterval(() => {
      this.state.timeRemaining--
      
      if (this.state.mode === 'work') {
        this.state.totalFocusTime++
      }
      
      if (this.state.timeRemaining <= 0) {
        this.onTimerComplete()
      }
      
      this.updateUI()
    }, 1000)
    
    this.updateUI()
  }

  stopTimer() {
    this.state.isRunning = false
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    this.updateUI()
  }

  resetTimer() {
    this.stopTimer()
    this.state.timeRemaining = this.getTotalDuration()
    this.updateUI()
  }

  skipSession() {
    this.onTimerComplete()
  }

  onTimerComplete() {
    this.stopTimer()
    
    const settings = this.api.getSettings()
    
    if (settings.soundEnabled) {
      this.playNotificationSound()
    }

    if (this.state.mode === 'work') {
      this.state.sessionsCompleted++
      
      const sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak || 4
      if (this.state.sessionsCompleted % sessionsBeforeLongBreak === 0) {
        this.state.mode = 'longBreak'
        this.api.showNotice('🎉 Great work! Time for a long break.')
      } else {
        this.state.mode = 'break'
        this.api.showNotice('✅ Session complete! Take a short break.')
      }
    } else {
      this.state.mode = 'work'
      this.api.showNotice('⏰ Break over! Ready to focus?')
    }

    this.state.timeRemaining = this.getTotalDuration()
    
    if (settings.autoStartBreaks && this.state.mode !== 'work') {
      this.startTimer()
    }
    
    this.updateUI()
  }

  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.warn('Could not play notification sound:', e)
    }
  }
}

// Export plugin class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroTimerPlugin
} else {
  window.PomodoroTimerPlugin = PomodoroTimerPlugin
}


// Script to add missing voice and meeting translations to all locale files

const fs = require('fs');
const path = require('path');

const voiceTranslations = {
  'zh-CN': {
    microphoneAccessDenied: '麦克风访问被拒绝或不可用',
    listeningForWakeWord: '正在监听唤醒词（点击停止VAD）',
    listeningForWakeWordShort: '正在监听唤醒词...',
    listeningForCommand: '正在监听命令...',
    startVoiceInput: '开始语音输入',
    assistantProcessing: '助手正在处理...',
    continuousListeningActive: '持续监听激活...（文本输入已禁用）',
    pttPrompt: 'PTT：点击麦克风说话，或在此输入...',
    typeOrUseVoice: '输入消息或使用语音...',
    listeningForQuote: '👂 正在监听 "{wakeWord}"...'
  },
  'fr-FR': {
    microphoneAccessDenied: 'Accès au microphone refusé ou indisponible',
    listeningForWakeWord: 'Écoute du mot de réveil (cliquez pour arrêter VAD)',
    listeningForWakeWordShort: 'Écoute du mot de réveil...',
    listeningForCommand: 'Écoute de la commande...',
    startVoiceInput: 'Démarrer l\'entrée vocale',
    assistantProcessing: 'L\'assistant traite...',
    continuousListeningActive: 'Écoute continue active... (saisie de texte désactivée)',
    pttPrompt: 'PTT : Cliquez sur le micro pour parler, ou tapez ici...',
    typeOrUseVoice: 'Tapez un message ou utilisez la voix...',
    listeningForQuote: '👂 Écoute de "{wakeWord}"...'
  },
  'de-DE': {
    microphoneAccessDenied: 'Mikrofonzugriff verweigert oder nicht verfügbar',
    listeningForWakeWord: 'Höre auf Aktivierungswort (klicken um VAD zu stoppen)',
    listeningForWakeWordShort: 'Höre auf Aktivierungswort...',
    listeningForCommand: 'Höre auf Befehl...',
    startVoiceInput: 'Spracheingabe starten',
    assistantProcessing: 'Der Assistent verarbeitet...',
    continuousListeningActive: 'Dauerhafte Aufnahme aktiv... (Texteingabe deaktiviert)',
    pttPrompt: 'PTT: Klicken Sie auf das Mikrofon zum Sprechen oder tippen Sie hier...',
    typeOrUseVoice: 'Nachricht eingeben oder Sprache verwenden...',
    listeningForQuote: '👂 Höre auf "{wakeWord}"...'
  },
  'ja-JP': {
    microphoneAccessDenied: 'マイクアクセスが拒否されたか利用できません',
    listeningForWakeWord: 'ウェイクワードを聞いています（VADを停止するにはクリック）',
    listeningForWakeWordShort: 'ウェイクワードを聞いています...',
    listeningForCommand: 'コマンドを聞いています...',
    startVoiceInput: '音声入力を開始',
    assistantProcessing: 'アシスタントが処理中...',
    continuousListeningActive: '連続リスニング中...（テキスト入力無効）',
    pttPrompt: 'PTT: マイクをクリックして話すか、ここに入力...',
    typeOrUseVoice: 'メッセージを入力するか音声を使用...',
    listeningForQuote: '👂 "{wakeWord}"を聞いています...'
  },
  'ko-KR': {
    microphoneAccessDenied: '마이크 액세스가 거부되었거나 사용할 수 없습니다',
    listeningForWakeWord: '웨이크 워드 듣는 중 (VAD 중지하려면 클릭)',
    listeningForWakeWordShort: '웨이크 워드 듣는 중...',
    listeningForCommand: '명령 듣는 중...',
    startVoiceInput: '음성 입력 시작',
    assistantProcessing: '어시스턴트가 처리 중...',
    continuousListeningActive: '연속 듣기 활성화... (텍스트 입력 비활성화)',
    pttPrompt: 'PTT: 마이크를 클릭하여 말하거나 여기에 입력...',
    typeOrUseVoice: '메시지를 입력하거나 음성 사용...',
    listeningForQuote: '👂 "{wakeWord}" 듣는 중...'
  },
  'pt-BR': {
    microphoneAccessDenied: 'Acesso ao microfone negado ou indisponível',
    listeningForWakeWord: 'Ouvindo palavra de ativação (clique para parar VAD)',
    listeningForWakeWordShort: 'Ouvindo palavra de ativação...',
    listeningForCommand: 'Ouvindo comando...',
    startVoiceInput: 'Iniciar entrada de voz',
    assistantProcessing: 'O assistente está processando...',
    continuousListeningActive: 'Escuta contínua ativa... (entrada de texto desativada)',
    pttPrompt: 'PTT: Clique no microfone para falar ou digite aqui...',
    typeOrUseVoice: 'Digite uma mensagem ou use voz...',
    listeningForQuote: '👂 Ouvindo "{wakeWord}"...'
  },
  'it-IT': {
    microphoneAccessDenied: 'Accesso al microfono negato o non disponibile',
    listeningForWakeWord: 'Ascolto parola di attivazione (clicca per fermare VAD)',
    listeningForWakeWordShort: 'Ascolto parola di attivazione...',
    listeningForCommand: 'Ascolto comando...',
    startVoiceInput: 'Avvia input vocale',
    assistantProcessing: 'L\'assistente sta elaborando...',
    continuousListeningActive: 'Ascolto continuo attivo... (input testo disabilitato)',
    pttPrompt: 'PTT: Clicca sul microfono per parlare o digita qui...',
    typeOrUseVoice: 'Digita un messaggio o usa la voce...',
    listeningForQuote: '👂 Ascolto "{wakeWord}"...'
  }
};

const meetingTranslations = {
  'zh-CN': {
    title: '会议录音和摘要',
    newRecording: '新录音',
    recording: '录音中...',
    startRecording: '开始录音',
    pauseRecording: '暂停',
    resumeRecording: '继续',
    stopRecording: '停止并处理',
    meetingTitle: '会议标题',
    participants: '参与者（逗号分隔）',
    quickNotes: '会议期间的快速笔记...',
    processing: '处理中...',
    transcribing: '转录音频...',
    generatingSummary: '生成摘要...',
    noRecordings: '还没有会议录音',
    noRecordingsDesc: '开始您的第一次录音以获取自动转录和摘要',
    searchMeetings: '搜索会议...',
    dateRange: '日期范围',
    filterByParticipant: '按参与者筛选',
    sortBy: '排序',
    clearFilters: '清除筛选',
    transcript: '转录',
    summary: '摘要',
    actionItems: '行动项目',
    noTranscript: '没有可用的转录',
    noSummary: '没有可用的摘要',
    noActionItems: '未识别到行动项目',
    copyToClipboard: '复制到剪贴板',
    download: '下载',
    delete: '删除',
    playRecording: '播放录音',
    exportAll: '导出全部',
    importMeetings: '导入会议',
    clearAll: '清除所有会议',
    toggleFilters: '切换筛选器'
  },
  'fr-FR': {
    title: 'Enregistreur et Résumé de Réunion',
    newRecording: 'Nouvel Enregistrement',
    recording: 'Enregistrement...',
    startRecording: 'Démarrer l\'Enregistrement',
    pauseRecording: 'Pause',
    resumeRecording: 'Reprendre',
    stopRecording: 'Arrêter et Traiter',
    meetingTitle: 'Titre de la Réunion',
    participants: 'Participants (séparés par des virgules)',
    quickNotes: 'Notes rapides pendant la réunion...',
    processing: 'Traitement...',
    transcribing: 'Transcription audio...',
    generatingSummary: 'Génération du résumé...',
    noRecordings: 'Pas Encore d\'Enregistrements de Réunion',
    noRecordingsDesc: 'Commencez votre premier enregistrement pour obtenir des transcriptions et résumés automatiques',
    searchMeetings: 'Rechercher des réunions...',
    dateRange: 'Plage de Dates',
    filterByParticipant: 'Filtrer par participant',
    sortBy: 'Trier Par',
    clearFilters: 'Effacer les Filtres',
    transcript: 'Transcription',
    summary: 'Résumé',
    actionItems: 'Éléments d\'Action',
    noTranscript: 'Aucune transcription disponible',
    noSummary: 'Aucun résumé disponible',
    noActionItems: 'Aucun élément d\'action identifié',
    copyToClipboard: 'Copier dans le Presse-papiers',
    download: 'Télécharger',
    delete: 'Supprimer',
    playRecording: 'Lire l\'Enregistrement',
    exportAll: 'Tout Exporter',
    importMeetings: 'Importer des Réunions',
    clearAll: 'Effacer Toutes les Réunions',
    toggleFilters: 'Basculer les Filtres'
  }
  // Add more languages as needed...
};

console.log('This script would update locale files but needs to be run differently.');
console.log('The translations are ready to be added manually to each file.');
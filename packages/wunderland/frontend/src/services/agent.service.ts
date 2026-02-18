// File: frontend/src/services/agent.service.ts
/**
 * @file agent.service.ts
 * @description Defines available AI agents, their configurations, and capabilities.
 * Manages the registry of agents for the application, including mapping to dedicated view components.
 * @version 1.7.0 - Added textAnimationConfig to IAgentCapability and updated V & Nerf agents.
 */

import type { Component as VueComponentType, DefineComponent } from 'vue';
import {
  ChatBubbleLeftEllipsisIcon,
  CodeBracketSquareIcon,
  UserCircleIcon,
  BookOpenIcon,
  CpuChipIcon,
  AcademicCapIcon,
  DocumentMagnifyingGlassIcon,
  BriefcaseIcon,
  CogIcon,
  SparklesIcon,
  PresentationChartLineIcon,
  BoltIcon, // Example for V
} from '@heroicons/vue/24/outline';
import { tGlobal } from '@/i18n';

// Import TextRevealConfig for agent-specific animation settings
import type { TextRevealConfig } from '@/composables/useTextAnimation';

export type AgentId = string;

export interface IDetailedCapabilityItem {
  id: string;
  label: string;
  description?: string;
  icon?: VueComponentType | string;
}

export interface IAgentCapability {
  canGenerateDiagrams?: boolean;
  usesCompactRenderer?: boolean;
  acceptsVoiceInput?: boolean; // Default true
  maxChatHistory?: number;
  handlesOwnInput?: boolean;
  showEphemeralChatLog?: boolean;
  // Add the new optional textAnimationConfig capability
  textAnimationConfig?: Partial<TextRevealConfig>;
  /**
   * Enable RAG (Retrieval Augmented Generation) memory for this agent.
   * When enabled, conversations and knowledge can be stored and retrieved semantically.
   */
  ragEnabled?: boolean;
  /**
   * RAG memory configuration for the agent.
   */
  ragConfig?: {
    /** Automatically ingest conversation turns into RAG memory */
    autoIngestConversations?: boolean;
    /** Triggers that initiate RAG retrieval */
    retrievalTriggers?: ('always' | 'keyword' | 'semantic' | 'explicit')[];
    /** Maximum number of chunks to retrieve per query */
    maxRetrievedChunks?: number;
    /** Minimum similarity score for retrieved chunks (0-1) */
    similarityThreshold?: number;
    /** Collection ID for this agent's RAG memory (defaults to agent-{agentId}) */
    collectionId?: string;
    /** Categories of memory to use */
    memoryCategories?: ('conversation_memory' | 'knowledge_base' | 'user_notes')[];
  };
}

export type AgentCategory = 'General' | 'Coding' | 'Productivity' | 'Learning' | 'Auditing' | 'Experimental' | 'Utility';

export interface IAgentDefinition {
  id: AgentId;
  label: string;
  description: string;
  longDescription?: string;
  component?: () => Promise<DefineComponent<any, any, any>>;
  iconComponent?: VueComponentType | string;
  iconClass?: string;
  avatar?: string;
  iconPath?: string;
  systemPromptKey: string;
  category: AgentCategory;
  capabilities: IAgentCapability; // This will now include textAnimationConfig
  examplePrompts?: string[];
  tags?: string[];
  detailedCapabilities?: IDetailedCapabilityItem[];
  inputPlaceholder?: string;
  isPublic: boolean;
  accessTier?: 'public' | 'member' | 'premium';
  themeColor?: string;
  holographicElement?: string;
  defaultVoicePersona?: string | { name?: string, voiceId?: string, lang?: string };
  isBeta?: boolean;
  isDefault?: boolean;
}

// --- Expanded Example Prompts ---

const generalChatPrompts: string[] = [
  "What's the capital of Japan?",
  "Explain the theory of relativity simply.",
  "How do I make a good cup of coffee?",
  "Tell me a fun fact about the ocean.",
  "What are the main ingredients in a Margherita pizza?",
  "How tall is Mount Everest?",
  "Who wrote 'Pride and Prejudice'?",
  "What's the weather like in London today?",
  "Give me a recipe for chocolate chip cookies.",
  "Explain the difference between a democracy and a republic.",
  "What are some famous landmarks in Paris?",
  "How does photosynthesis work?",
  "Who was Leonardo da Vinci?",
  "What is the currency of Brazil?",
  "Tell me about the Roman Empire.",
  "How many planets are in our solar system?",
  "What is the boiling point of water in Celsius?",
  "Suggest a good book to read this month.",
  "What are the symptoms of the common cold?",
  "How do I tie a Windsor knot?",
  "Explain the concept of cryptocurrency.",
  "Who won the FIFA World Cup in 2022?",
  "What are some tips for saving money?",
  "Tell me about the Great Wall of China.",
  "How does a car engine work?",
  "What are the benefits of meditation?",
  "Who invented the telephone?",
  "What is the chemical symbol for gold?",
  "Give me a quick summary of Hamlet.",
  "What are primary colors?",
  "How long does it take to fly from New York to Los Angeles?",
  "What is the internet?",
  "Can you recommend a good movie for family night?",
  "What are the different types of renewable energy?",
  "Who is the current President of the United States?",
  "Explain black holes.",
  "What are the Seven Wonders of the Ancient World?",
  "How do I change a flat tire?",
  "What is the meaning of 'carpe diem'?",
  "Tell me a joke.",
  "What are the basic rules of chess?",
  "How is honey made?",
  "What's the speed of light?",
  "Who painted the Mona Lisa?",
  "What are some healthy breakfast ideas?",
  "Explain the water cycle.",
  "What is quantum entanglement?",
  "Can you give me a random number between 1 and 100?",
  "What are the main causes of climate change?",
  "Who discovered penicillin?",
  "What is the largest animal on Earth?",
  "How do I improve my public speaking skills?",
  "What are some common logical fallacies?",
  "Tell me about the French Revolution.",
  "What is the purpose of the United Nations?",
  "How does a microwave oven work?",
  "What are some synonyms for 'happy'?",
  "What are the different blood types?",
  "Explain the stock market for a beginner.",
  "Who was Cleopatra?",
  "What is the significance of the Rosetta Stone?",
  "How do I start learning a new language?",
  "What are some famous classical music composers?",
  "Tell me about a recent scientific discovery.",
  "What is the official language of Australia?",
  "How can I be more productive?",
  "What are the stages of sleep?",
  "Explain the Pythagorean theorem.",
  "Who wrote '1984'?",
  "What are some good exercises for back pain?",
  "What is a leap year?",
  "How do computers store information?",
  "Tell me about the history of jazz music.",
  "What are the pros and cons of social media?",
  "How do I write a resume?",
  "What is the capital of Canada?",
  "Explain the concept of artificial intelligence."
];

const quickHelperPrompts: string[] = [
  "What time is it in New York?",
  "Convert 100 USD to EUR.",
  "Spell 'onomatopoeia'.",
  "Define 'serendipity'.",
  "Boiling point of water?",
  "Capital of France?",
  "2 + 2?",
  "How many days in June?",
  "What's today's date?",
  "Largest planet?",
  "Chemical symbol for water?",
  "Meaning of 'LOL'?",
  "Is it going to rain today in Las Vegas?",
  "Quick translation of 'hello' to Spanish?",
  "Who is the CEO of SpaceX?",
  "What is 5 factorial?",
  "What's a synonym for 'fast'?",
  "Antonym for 'hot'?",
  "How many ounces in a pound?",
  "What is the square root of 64?",
  "Who painted Starry Night?",
  "What currency does Japan use?",
  "How many continents are there?",
  "Is Pluto a planet?",
  "What's a common abbreviation for 'Doctor'?",
  "What does 'FAQ' stand for?",
  "How many sides does a hexagon have?",
  "What is the color of the sky?",
  "What's the main ingredient in bread?",
  "Who wrote Romeo and Juliet?",
  "What is the current year?",
  "How do I say 'thank you' in French?",
  "What is the chemical formula for salt?",
  "Fastest land animal?",
  "What does USB stand for?"
];

const codingAssistantPrompts: string[] = [
  "How to implement quicksort in Python?",
  "Debug this C++ snippet: [paste snippet here]",
  "Explain JavaScript closures.",
  "What are the differences between 'let', 'const', and 'var' in JavaScript?",
  "How do I create a class in Java?",
  "Write a Python function to reverse a string.",
  "Explain REST API principles.",
  "What is a Docker container?",
  "How to handle exceptions in C#?",
  "Generate a regular expression to validate an email.",
  "What is Object-Oriented Programming?",
  "Explain the concept of 'async/await' in Node.js.",
  "How do I connect to a MySQL database using PHP?",
  "What are common Git commands for branching?",
  "Write a simple 'Hello, World!' program in Go.",
  "How do I parse JSON in Swift?",
  "What is SQL injection and how to prevent it?",
  "Explain the difference between TCP and UDP.",
  "How to use CSS Flexbox for layout?",
  "What is a lambda function in Python?",
  "Write a unit test for this TypeScript function: [paste function here]",
  "How do I iterate over a map in C++?",
  "What are SOLID principles in software design?",
  "Explain Big O notation with an example.",
  "How to make an HTTP GET request in Ruby?",
  "What is middleware in the context of web frameworks?",
  "How to set up a virtual environment in Python?",
  "Write a SQL query to find all users with duplicate email addresses.",
  "What is the difference between an interface and an abstract class?",
  "How to manage state in a React application?",
  "Explain CORS (Cross-Origin Resource Sharing).",
  "Write a bash script to count files in a directory.",
  "What is the purpose of a 'finally' block in exception handling?",
  "How to use 'map', 'filter', and 'reduce' in JavaScript?",
  "What are microservices architecture?",
  "How do I declare and use a pointer in C?",
  "Explain dependency injection.",
  "How to sort an array of objects by a property in JavaScript?",
  "What is the difference between NoSQL and SQL databases?",
  "Write a Java method to find the factorial of a number.",
  "How to handle file uploads in Express.js?",
  "What are arrow functions in ES6?",
  "Explain the Event Loop in JavaScript.",
  "How to create a responsive navigation bar using HTML and CSS?",
  "What is polymorphism in OOP?",
  "Write a Python script to read data from a CSV file.",
  "How to use Promises in JavaScript?",
  "What is version control and why is it important?",
  "Explain the concept of recursion using a Python example.",
  "How to style a button with rounded corners using CSS?",
  "What are data structures like arrays, linked lists, and hash tables?",
  "How do I use environment variables in a Node.js application?",
  "Write a function to check if a string is a palindrome in C#.",
  "What is the purpose of an ORM (Object-Relational Mapper)?",
  "How to center a div both horizontally and vertically using CSS Grid?",
  "Explain the differences between GET and POST HTTP methods.",
  "What is a JWT (JSON Web Token) and how is it used for authentication?",
  "How to merge two sorted arrays in Java?",
  "What are some best practices for writing clean code?",
  "Explain the concept of 'this' keyword in JavaScript.",
  "How to perform CRUD operations using Python and SQLite?",
  "What is functional programming?",
  "How to set up a basic web server with Python's Flask?",
  "Explain the difference between '==' and '===' in JavaScript.",
  "What is lazy loading?",
  "How to read command line arguments in a Python script?",
  "What are API rate limits?",
  "Write a simple web scraper in Python using BeautifulSoup.",
  "Explain the concept of prototypal inheritance in JavaScript.",
  "How to use media queries in CSS for responsive design?",
  "What is a CDN (Content Delivery Network)?",
  "How to create and use modules in Python?",
  "What are design patterns? Give an example of the Factory pattern.",
  "How do I work with dates and times in Java?",
  "Explain how SSL/TLS works to secure web communication."
];

const systemDesignerPrompts: string[] = [
  "Design a URL shortening service like bit.ly.",
  "How would you design a real-time chat application?",
  "Outline the architecture for a video streaming platform like Netflix.",
  "Design a distributed key-value store.",
  "What are the components of a food delivery app like Uber Eats?",
  "Design an API for a weather service.",
  "How would you architect a social media feed system like Twitter's timeline?",
  "Design a system for online ticket booking.",
  "What considerations are important for designing a scalable e-commerce website?",
  "Outline the architecture for a recommendation engine.",
  "Design a system to handle flash sales or high-traffic events.",
  "How would you design a search engine for a large document corpus?",
  "Design a distributed task scheduler.",
  "What are the trade-offs between microservices and monolithic architectures?",
  "Design a logging and monitoring system for a large-scale application.",
  "How to ensure high availability for a critical web service?",
  "Design a system for processing large volumes of IoT data.",
  "What are different database sharding strategies?",
  "Design a caching layer for a web application.",
  "How would you design a global leaderboard for a game?",
  "Outline the architecture for a ride-sharing app like Uber.",
  "Design a system for detecting plagiarism in documents.",
  "What are the key considerations for API security in a distributed system?",
  "Design a content delivery network (CDN).",
  "How would you handle data consistency in a distributed database system?",
  "Design an online code collaboration platform like Google Docs.",
  "What are different load balancing techniques?",
  "Design a system for personalized news aggregation.",
  "How to design a fault-tolerant system?",
  "Outline the architecture for a cloud storage service like Dropbox.",
  "Design a job processing queue.",
  "What are CAP theorem and its implications in system design?",
  "Design a system for tracking user analytics on a website.",
  "How would you approach designing a scalable notification system?",
  "Design a system for A/B testing features.",
  "What are the challenges in designing for multi-tenancy?",
  "Design an authentication and authorization system.",
  "How would you manage data replication across different regions?",
  "Design a rate limiting system for an API.",
  "What are the design considerations for a low-latency trading system?",
  "Design a web crawler.",
  "How to handle data migrations in a large-scale system?",
  "Design a system for managing online polls and surveys.",
  "What are the pros and cons of eventual consistency vs. strong consistency?",
  "Design a distributed message queue like Kafka.",
  "How would you design a system for managing digital coupons?",
  "Outline an architecture for a spam detection filter.",
  "Design a system that can handle a sudden surge of 10x traffic.",
  "What are common bottlenecks in web applications and how to address them?",
  "Design a password storage system with security best practices."
];

const meetingSummarizerPrompts: string[] = [
  "Summarize this meeting transcript: [paste transcript]",
  "Identify key decisions from these notes: [paste notes]",
  "Extract action items and owners from the following text: [paste text]",
  "Provide a concise summary of our marketing strategy discussion.",
  "What were the main outcomes of the project kickoff meeting?",
  "Generate a list of follow-up tasks based on this conversation.",
  "Condense this one-hour meeting into a 5-point summary.",
  "Who is responsible for what after our weekly sync?",
  "Summarize the client feedback from this call transcript.",
  "What were the main topics discussed in the Q3 planning session?",
  "Create a brief overview of the budget review meeting.",
  "Highlight any unresolved issues from this team huddle.",
  "Turn these rambling notes into a structured meeting summary.",
  "What are the next steps agreed upon in the design review?",
  "Summarize the arguments for and against the proposed feature.",
  "Extract all questions asked during this Q&A session.",
  "Provide a high-level summary of the sales team meeting.",
  "What commitments were made during the stakeholder update?",
  "Condense this project status update into key bullet points.",
  "Summarize the discussion points about the new product launch.",
  "Identify any risks or blockers mentioned in these notes.",
  "What was the consensus reached on the new UI design?",
  "Create a summary focusing on deadlines and timelines mentioned.",
  "Extract any assigned tasks with their due dates from this meeting log.",
  "Summarize the feedback received on the latest prototype.",
  "What were the key performance indicators discussed?",
  "Generate an executive summary from this lengthy meeting report.",
  "List all participants and their main contributions from this transcript.",
  "What solutions were proposed for the current production issue?",
  "Summarize the brainstorming session for new marketing slogans."
];

const diaryAgentPrompts: string[] = [
  "How was your day today?",
  "What's on your mind right now?",
  "Write about something you're grateful for.",
  "What's a challenge you faced recently and how did you handle it?",
  "Describe a goal you're working towards.",
  "What made you smile today?",
  "Reflect on a recent learning experience.",
  "Is there anything you're worried or anxious about?",
  "Write down three things you accomplished today.",
  "What are you looking forward to this week?",
  "Describe a place you'd love to visit and why.",
  "What's a book, movie, or song that resonated with you lately?",
  "Jot down some ideas that have been brewing.",
  "How are you feeling, really?",
  "What's a small act of kindness you witnessed or performed?",
  "Write about a childhood memory.",
  "What are your top priorities for tomorrow?",
  "Is there a decision you're mulling over?",
  "What does success mean to you right now?",
  "Describe a moment when you felt proud of yourself.",
  "What's something new you learned or tried?",
  "How can you take better care of yourself this week?",
  "Write a letter to your future self.",
  "What's a personal boundary you're trying to maintain?",
  "Reflect on your progress towards a long-term goal.",
  "What's a limiting belief you want to overcome?",
  "Describe a moment of peace or quiet you experienced.",
  "What inspires you?",
  "How can you make tomorrow a little bit better than today?",
  "What are you passionate about?",
  "Let's explore my feelings about a recent event.",
  "I need to vent about something frustrating.",
  "Help me process a difficult conversation I had.",
  "What are some of my strengths I can leverage?",
  "I want to set some intentions for the coming month.",
  "Let's brainstorm solutions to a problem I'm facing.",
  "Record my thoughts on the current project I'm working on.",
  "What are my hopes for the future?",
  "Reflect on my values and if I'm living by them.",
  "I need a space to just write freely without judgment."
];

const codingInterviewerPrompts: string[] = [
  "I'm ready for a mock coding interview.",
  "Give me a coding problem suitable for a junior developer.",
  "Can we do a data structures and algorithms question?",
  "Ask me an easy-level array manipulation problem.",
  "I'd like to practice a medium-difficulty string problem.",
  "Let's focus on tree traversal algorithms.",
  "Give me a problem that can be solved with dynamic programming.",
  "I want to try a graph algorithm question.",
  "Can you ask me a question about linked lists?",
  "Let's simulate a system design question for a junior role.",
  "Propose a coding challenge related to sorting.",
  "I'm looking for a problem that tests my understanding of hash maps.",
  "Present a scenario where I need to optimize code for performance.",
  "What's a common interview question about recursion?",
  "Let's simulate the first 20 minutes of a technical screen.",
  "Ask me to write a function and then discuss its time complexity.",
  "Give me a problem that involves bit manipulation.",
  "I'm ready for a Python-focused coding challenge.",
  "Can we work through a JavaScript-based problem?",
  "Let's try a Java interview question.",
  "Ask me a conceptual question about software engineering principles before the coding.",
  "I'm prepared for a challenging algorithm problem.",
  "Start with a warm-up coding question.",
  "Can you evaluate my approach to solving a problem?",
  "Let's discuss different solutions to a given problem.",
  "Give me a problem, I'll code it, then you provide feedback.",
  "I'd like to practice explaining my thought process as I code.",
  "Ask me about debugging a piece of code.",
  "Let's work on a problem involving stacks or queues.",
  "Give me a problem that might appear in a FAANG interview.",
  "I'm ready for a problem involving matrix manipulation.",
  "Can we cover a search algorithm, like binary search?",
  "Let's simulate a pair programming interview exercise.",
  "Test my knowledge of fundamental data structures.",
  "Ask me to design a simple class or API.",
  "Give me a problem that can be solved in multiple ways.",
  "I'm ready. Ask your first coding question.",
  "Challenge me with a problem that requires careful edge case handling.",
  "Let's do a whiteboard-style coding problem.",
  "Can you give me a problem where I have to write unit tests as well?"
];

const tutorAgentPrompts: string[] = [
  "Explain the basics of quantum physics.",
  "Teach me about the French Revolution.",
  "Can you help me understand calculus concepts like derivatives?",
  "I want to learn about ancient Egyptian mythology.",
  "Explain the process of cellular respiration.",
  "What are the key principles of macroeconomics?",
  "Teach me the fundamentals of music theory.",
  "I'm struggling with Python list comprehensions, can you explain?",
  "Let's review the causes of World War I.",
  "Can you explain Newton's Laws of Motion with examples?",
  "I want to understand how DNA replication works.",
  "Teach me about different types of chemical bonds.",
  "Explain the significance of the Renaissance period.",
  "Help me grasp the concept of machine learning.",
  "What are the main branches of philosophy?",
  "Let's discuss the theory of evolution by natural selection.",
  "Can you explain the structure of the Earth's atmosphere?",
  "I need help understanding Shakespearean sonnets.",
  "Teach me about the basics of astronomy and celestial bodies.",
  "What is the difference between mitosis and meiosis?",
  "Explain the core concepts of blockchain technology.",
  "I want to learn about the history of art in the 20th century.",
  "Can you break down the components of a good argumentative essay?",
  "Teach me about the human digestive system.",
  "What are the fundamental data structures in computer science?",
  "Explain the principles of supply and demand.",
  "Let's explore the works of famous philosophers like Plato and Aristotle.",
  "Can you teach me about different poetic devices?",
  "I want to understand the basics of electricity and circuits.",
  "Explain the importance of biodiversity.",
  "Teach me about the different forms of government.",
  "What are common logical fallacies I should be aware of?",
  "Let's dive into the history of the internet.",
  "Can you help me with stoichiometry in chemistry?",
  "Teach me about the major world religions.",
  "Explain the concept of compound interest.",
  "I want to learn how to analyze a historical document.",
  "What are the key elements of storytelling?",
  "Teach me about the basics of web development (HTML, CSS, JS).",
  "Explain the difference between weather and climate.",
  "Let's review the periodic table of elements.",
  "Can you help me understand literary themes in 'To Kill a Mockingbird'?",
  "Teach me about the scientific method.",
  "What are the different types of galaxies?",
  "Explain the basics of statistics, like mean, median, and mode.",
  "I want to learn about the Cold War.",
  "Can you explain the concept of 'algorithm' in simple terms?",
  "Teach me about the key figures of the Civil Rights Movement.",
  "What is the role of the Federal Reserve?",
  "Explain the basic principles of photography.",
  "Let's study the anatomy of the human brain.",
  "Can you teach me about impressionist painters?",
  "I want to understand the basics of genetics.",
  "Explain the concepts of force and motion.",
  "Teach me about the geography of South America.",
  "What are some key events in early American history?",
  "Can you help me prepare for a debate on renewable energy?",
  "Explain the theory of plate tectonics.",
  "I want to learn about different programming paradigms.",
  "Teach me about the solar system's planets in detail.",
  "What are the main features of Gothic architecture?",
  "Explain the basics of critical thinking.",
  "Let's discuss the impact of social media on society.",
  "Can you teach me how to solve quadratic equations?",
  "I want to learn about the key concepts in psychology.",
  "Explain the process of cloud formation.",
  "Teach me about the history of the Roman Republic.",
  "What are the ethical considerations in artificial intelligence?",
  "Can you help me understand the stock market basics?",
  "Explain the difference between eukaryotes and prokaryotes.",
  "Let's study the different ecosystems on Earth.",
  "Teach me about the main ideas of the Enlightenment.",
  "What are the functions of different parts of a plant?",
  "Explain the basics of cybersecurity.",
  "I want to learn about famous speeches in history.",
  "Can you help me improve my essay writing skills?",
  "Teach me about the layers of the ocean."
];

const lcAuditPrompts: string[] = [
  "Analyze LeetCode problem 20: Valid Parentheses.",
  "Provide a detailed breakdown of the 'Two Sum' problem (LC #1).",
  "Explain common pitfalls for LeetCode problem 15: 3Sum.",
  "Generate a visual slideshow for the solution to LC #206: Reverse Linked List.",
  "Give me an exhaustive commented code solution in Python for LC #53: Maximum Subarray.",
  "Compare different approaches (e.g., brute-force, optimal) for LC #121: Best Time to Buy and Sell Stock.",
  "Audit my Python solution for LC #70: Climbing Stairs. [provide solution]",
  "What are the time and space complexity for typical solutions to LC #21: Merge Two Sorted Lists?",
  "Discuss edge cases for LeetCode problem 'Median of Two Sorted Arrays'.",
  "Show me how dynamic programming applies to LC #322: Coin Change.",
  "Explain the sliding window technique with an example like LC #3: Longest Substring Without Repeating Characters.",
  "Provide hints for LeetCode problem 'Container With Most Water'.",
  "Analyze the constraints and potential optimizations for LC #42: Trapping Rain Water.",
  "Help me understand the intuition behind the solution to LC #146: LRU Cache.",
  "Generate test cases for LeetCode problem 'Word Break' (LC #139).",
  "What data structures are most useful for graph problems like LC #200: Number of Islands?",
  "Explain the backtracking approach for LC #78: Subsets.",
  "Provide a step-by-step walkthrough of a solution for LC #199: Binary Tree Right Side View.",
  "Analyze the complexity of different sorting algorithms in the context of LeetCode problems.",
  "Discuss common mistakes made when solving tree traversal problems (e.g., LC #94, #144, #145).",
  "Provide commented C++ code for LC #5: Longest Palindromic Substring.",
  "How can I optimize a recursive solution for a LeetCode problem to avoid TLE?",
  "Explain the use of heaps/priority queues in problems like LC #215: Kth Largest Element in an Array.",
  "Analyze the problem statement for LC #102: Binary Tree Level Order Traversal.",
  "What are some follow-up questions an interviewer might ask after solving LC #238: Product of Array Except Self?",
  "Provide a deep dive into the solution for LC #56: Merge Intervals.",
  "Explain the two-pointer technique for problems like LC #11: Container With Most Water.",
  "How does memoization improve performance in recursive solutions for LeetCode problems?",
  "Analyze the trade-offs between iterative and recursive solutions for tree problems.",
  "Generate a list of related LeetCode problems if I'm practicing graph traversals.",
  "What are some key patterns to recognize in array manipulation problems on LeetCode?",
  "Explain the 'fast and slow pointer' technique for linked list problems like LC #141: Linked List Cycle.",
  "Provide a commented Java solution for LC #125: Valid Palindrome.",
  "Discuss how to approach problems involving binary search on the answer space.",
  "Analyze the constraints for LC #79: Word Search and how they affect the solution approach."
];

// Prompts for "V" (can be more complex/nuanced)
const vAssistantPrompts: string[] = [
  "Elaborate on the socio-economic impacts of AI in the next decade.",
  "Compare and contrast Kantian ethics with Utilitarianism, providing modern examples.",
  "Draft a project proposal for developing a sustainable urban farming initiative.",
  "Analyze the geopolitical implications of recent advancements in quantum computing.",
  "Provide a multi-faceted strategy for addressing misinformation online.",
  "Explain the core concepts of string theory for a non-physicist with a strong science background.",
  "Generate a creative story outline based on the theme of 'identity in a digital age'.",
  "Discuss the philosophical arguments for and against free will.",
  "Outline a research methodology for studying the effects of remote work on employee well-being.",
  "Provide a deep dive into the architecture of the internet, from physical layers to application protocols."
];


// --- Agent Component Async Imports ---
// IMPORTANT: Adjust these paths based on your actual file structure.
// Assuming 'catalog' is the parent directory for individual agent folders.

const NerfAgentView = () => import('@/components/agents/catalog/NerfAgent/NerfAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const VAgentView = () => import('@/components/agents/catalog/VAgent/VAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const CodingAgentView = () => import('@/components/agents/catalog/CodingAgent/CodingAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const SystemsDesignAgentView = () => import('@/components/agents/catalog/SystemsDesignAgent/SystemsDesignAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const BusinessMeetingAgentView = () => import('@/components/agents/catalog/BusinessMeetingAgent/BusinessMeetingAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const DiaryAgentView = () => import('@/components/agents/catalog/DiaryAgent/DiaryAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const CodingInterviewerAgentView = () => import('@/components/agents/catalog/CodingInterviewerAgent/CodingInterviewerAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const TutorAgentView = () => import('@/components/agents/catalog/TutorAgent/TutorAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;
const LCAuditAgentView = () => import('@/components/agents/catalog/LCAuditAgent/LCAuditAgentView.vue') as unknown as Promise<DefineComponent<any, any, any>>;


// --- Agent Definitions ---
const agents: IAgentDefinition[] = [
  {
    id: 'nerf_agent' as AgentId, // This is "Nerf"
  get label() { return tGlobal('agents.nerf.name') || 'Nerf'; },
  get description() { return tGlobal('agents.nerf.description') || 'Your friendly and efficient general AI for quick questions and information.'; },
  get longDescription() { return tGlobal('agents.nerf.longDescription') || 'Nerf is designed for straightforward Q&A, quick facts, definitions, and simple explanations. It aims for clarity and conciseness, making it a great go-to for everyday inquiries.'; },
    component: NerfAgentView,
    iconComponent: ChatBubbleLeftEllipsisIcon,
    iconClass: 'text-orange-400 dark:text-orange-500', // Keep Nerf's orange
    systemPromptKey: 'nerf_chat', // Use the new nerf_chat.md prompt
    category: 'General',
    capabilities: { canGenerateDiagrams: false, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 8, showEphemeralChatLog: true, handlesOwnInput: true },
    examplePrompts: generalChatPrompts,
    tags: ['general knowledge', 'q&a', 'information', 'quick help', 'concise', 'friendly'],
  get inputPlaceholder() { return tGlobal('agents.nerf.placeholder') || 'Ask Nerf anything...'; },
    isPublic: true,
    accessTier: 'member', // Was member in original
    themeColor: '--nerf-accent', // Example for CSS variable theming
  },
  {
    id: 'v_agent' as AgentId, // New ID for V
  get label() { return tGlobal('vAgent.name') || 'V'; },
  get description() { return tGlobal('vAgent.description') || 'Advanced, dynamic, and insightful AI assistant for complex tasks and explorations.'; },
  get longDescription() { return tGlobal('vAgent.longDescription') || 'V is a powerful, polymathic AI designed to engage in nuanced discussions, synthesize complex information, and provide comprehensive, well-articulated responses. Ideal for deep dives, creative brainstorming, and strategic thinking.'; },
    component: VAgentView,
    iconComponent: BoltIcon, // Using BoltIcon for "powerful"
    iconClass: 'text-cyan-400 dark:text-cyan-500', // V's distinct color
    systemPromptKey: 'v_default_assistant', // New prompt for V
    category: 'General',
    capabilities: { canGenerateDiagrams: true, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 15, showEphemeralChatLog: true, handlesOwnInput: true },
    examplePrompts: vAssistantPrompts, // Dedicated prompts for V
    tags: ['advanced AI', 'dynamic', 'insightful', 'complex problem solving', 'research', 'analysis'],
  get inputPlaceholder() { return tGlobal('vAgent.placeholder') || 'Pose your complex query or exploration to V...'; },
    isPublic: true,
    accessTier: 'public', // V is the new powerful default
    isDefault: true, // V could be the new default
    themeColor: '--v-accent', // Example for CSS variable theming
  },
  {
    id: 'coding_assistant' as AgentId,
  get label() { return tGlobal('agents.codePilot.name') || 'CodePilot'; },
  get description() { return tGlobal('agents.codePilot.description') || 'Expert coding assistance, debugging, and explanations across multiple languages.'; },
    component: CodingAgentView,
    iconComponent: CodeBracketSquareIcon,
    iconClass: 'text-rose-400 dark:text-rose-500',
    systemPromptKey: 'coding',
    category: 'Coding',
    capabilities: { canGenerateDiagrams: true, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 25, showEphemeralChatLog: true, handlesOwnInput: true },
    examplePrompts: codingAssistantPrompts,
    tags: ['programming', 'dev', 'code', 'debug', 'algorithms', 'data structures'],
  get inputPlaceholder() { return tGlobal('agents.codePilot.placeholder') || 'Ask CodePilot about code...'; },
    isPublic: true,
    accessTier: 'public',
  },
  {
    id: 'system_designer' as AgentId,
  get label() { return tGlobal('agents.architectron.name') || 'Architectron'; },
  get description() { return tGlobal('agents.architectron.description') || 'Collaboratively design and diagram complex software and system architectures.'; },
    component: SystemsDesignAgentView,
    iconComponent: CpuChipIcon, // Keeping CpuChipIcon for Architectron
    iconClass: 'text-indigo-400 dark:text-indigo-500',
    systemPromptKey: 'system_design',
    category: 'Coding',
    capabilities: { canGenerateDiagrams: true, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 30, handlesOwnInput: true, showEphemeralChatLog: true },
    examplePrompts: systemDesignerPrompts,
  get inputPlaceholder() { return tGlobal('agents.architectron.placeholder') || 'Describe the system to design...'; },
    isPublic: true,
    accessTier: 'public',
  },
  {
    id: 'meeting_summarizer' as AgentId,
  get label() { return tGlobal('agents.meetingScribe.name') || 'Meeting Scribe'; },
  get description() { return tGlobal('agents.meetingScribe.description') || 'Processes your meeting notes or transcripts into clear, structured summaries with action items.'; },
    component: BusinessMeetingAgentView,
    iconComponent: BriefcaseIcon,
    iconClass: 'text-cyan-400 dark:text-cyan-500', // Same as V, consider differentiating
    systemPromptKey: 'meeting',
    category: 'Productivity',
    capabilities: { canGenerateDiagrams: true, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 10, handlesOwnInput: true, showEphemeralChatLog: false },
    examplePrompts: meetingSummarizerPrompts,
  get inputPlaceholder() { return tGlobal('agents.meetingScribe.placeholder') || 'Paste notes or dictate discussion for summary...'; },
    isPublic: true,
    accessTier: 'public',
  },
  {
    id: 'diary_agent' as AgentId,
  get label() { return tGlobal('agents.echo.name') || 'Echo'; },
  get description() { return tGlobal('agents.echo.description') || 'Your personal, empathetic AI diary and notetaker for reflection and organizing thoughts.'; },
    component: DiaryAgentView,
    iconComponent: BookOpenIcon,
    iconClass: 'text-purple-400 dark:text-purple-500',
    systemPromptKey: 'diary',
    category: 'Productivity',
    capabilities: { canGenerateDiagrams: true, usesCompactRenderer: false, acceptsVoiceInput: true, maxChatHistory: 10, handlesOwnInput: true, showEphemeralChatLog: true },
    examplePrompts: diaryAgentPrompts,
  get inputPlaceholder() { return tGlobal('agents.echo.placeholder') || 'Share your thoughts with Echo...'; },
    isPublic: true,
    accessTier: 'public',
  },
  {
    id: 'coding_interviewer' as AgentId,
  get label() { return tGlobal('agents.aiInterviewer.name') || 'AI Interviewer'; },
  get description() { return tGlobal('agents.aiInterviewer.description') || 'Simulates a technical coding interview, providing problems and evaluating solutions.'; },
    component: CodingInterviewerAgentView,
    iconComponent: UserCircleIcon,
    iconClass: 'text-pink-500 dark:text-pink-600', // Changed color for distinction
    systemPromptKey: 'coding_interviewer',
    category: 'Learning',
    capabilities: { canGenerateDiagrams: false, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 20, handlesOwnInput: true, showEphemeralChatLog: true },
    examplePrompts: codingInterviewerPrompts,
  get inputPlaceholder() { return tGlobal('agents.aiInterviewer.placeholder') || 'Ready for your mock coding interview?'; },
    isPublic: true,
    accessTier: 'public',
  },
  {
    id: 'tutor_agent' as AgentId,
  get label() { return tGlobal('agents.professorAstra.name') || 'Professor Astra'; },
  get description() { return tGlobal('agents.professorAstra.description') || 'Your adaptive AI tutor for exploring subjects and mastering concepts.'; },
    component: TutorAgentView,
    iconComponent: AcademicCapIcon,
    iconClass: 'text-amber-500 dark:text-amber-400',
    systemPromptKey: 'tutor',
    category: 'Learning',
    capabilities: { canGenerateDiagrams: true, usesCompactRenderer: true, acceptsVoiceInput: true, maxChatHistory: 15, handlesOwnInput: true, showEphemeralChatLog: true },
    examplePrompts: tutorAgentPrompts,
  get inputPlaceholder() { return tGlobal('agents.professorAstra.placeholder') || 'What topic shall we learn today?'; },
    isPublic: true,
    accessTier: 'public',
  },
  {
    id: 'lc_audit_aide' as AgentId,
  get label() { return tGlobal('agents.lcAudit.name') || 'LC-Audit'; },
  get description() { return tGlobal('agents.lcAudit.description') || 'In-depth LeetCode problem analysis and interview aide.'; },
    component: LCAuditAgentView,
    iconComponent: DocumentMagnifyingGlassIcon,
    iconClass: 'text-teal-500 dark:text-teal-400',
    systemPromptKey: 'lc_audit_aide',
    category: 'Auditing',
    capabilities: {
      canGenerateDiagrams: true, usesCompactRenderer: true, acceptsVoiceInput: false,
      maxChatHistory: 10, handlesOwnInput: true, showEphemeralChatLog: false,
    },
    examplePrompts: lcAuditPrompts,
    tags: ['leetcode', 'audit', 'interview prep', 'algorithms', 'data structures', 'problem solving'],
    detailedCapabilities: [
        { id: 'deep-analysis', label: 'Deep Problem Analysis', icon: CogIcon },
        { id: 'slideshow-viz', label: 'Visual Slideshows', icon: PresentationChartLineIcon },
        { id: 'commented-code', label: 'Exhaustive Code Comments', icon: CodeBracketSquareIcon },
    ],
  get inputPlaceholder() { return tGlobal('agents.lcAudit.placeholder') || 'Provide problem context for LC-Audit analysis...'; },
    isPublic: false, // Making this premium as per original
    accessTier: 'premium',
    isBeta: true,
  },
  // --- Placeholder & Utility Agents ---
  // Removing the 'assistant' (old V) as it's now 'v_agent'.
  // Keeping alias logic but ensuring they point to the correct canonical agent ID.
  { id: 'general' as AgentId, get label() { return tGlobal('agent.defaultName') || 'Assistant'; }, get description() { return tGlobal('vAgent.description') || 'Alias for V'; }, iconComponent: ChatBubbleLeftEllipsisIcon, systemPromptKey: 'default_v_assistant', category: 'General', capabilities: {}, isPublic: true, accessTier: 'member' },
  { id: 'general-ai' as AgentId, get label() { return tGlobal('agent.defaultName') || 'Assistant'; }, get description() { return tGlobal('vAgent.description') || 'Alias for V'; }, iconComponent: ChatBubbleLeftEllipsisIcon, systemPromptKey: 'default_v_assistant', category: 'General', capabilities: {}, isPublic: true, accessTier: 'member' },

  { id: 'private-dashboard-placeholder' as AgentId, label: 'Dashboard', description: 'User dashboard area.', iconComponent: SparklesIcon, systemPromptKey: 'v_agent', category: 'Utility', capabilities: {}, isPublic: false, accessTier: 'member' },
  { id: 'rate-limit-exceeded' as AgentId, label: 'Rate Limited', description: 'Displayed when rate limits are hit.', iconComponent: SparklesIcon, systemPromptKey: 'v_agent', category: 'Utility', capabilities: {}, isPublic: true, accessTier: 'public' },
  { id: 'public-welcome-placeholder' as AgentId, label: 'Welcome', description: 'Initial public welcome screen.', iconComponent: SparklesIcon, systemPromptKey: 'v_agent', category: 'Utility', capabilities: {}, isPublic: true, accessTier: 'public' },
  { id: 'no-public-agents-placeholder' as AgentId, label: 'No Agents Available', description: 'Placeholder if no agents are configured.', iconComponent: SparklesIcon, systemPromptKey: 'v_agent', category: 'Utility', capabilities: {}, isPublic: true, accessTier: 'public' },
  { id: 'system-error' as AgentId, label: 'System Error', description: 'Displayed on critical system error.', iconComponent: SparklesIcon, systemPromptKey: 'v_agent', category: 'Utility', capabilities: {}, isPublic: false, accessTier: 'member' },
];

const placeholderAgentIds: AgentId[] = [
    'private-dashboard-placeholder',
    'rate-limit-exceeded',
    'public-welcome-placeholder',
    'no-public-agents-placeholder',
    'system-error'
];

class AgentService {
  private agentsMap: Map<AgentId, IAgentDefinition>;
  private defaultPublicAgentId: AgentId = 'v_agent'; // V is the new powerful public default
  private defaultPrivateAgentId: AgentId = 'v_agent'; // Nerf as member default

  constructor() {
    this.agentsMap = new Map();
    const definedAgents = new Map<AgentId, IAgentDefinition>();

    // Add all canonical agents first
    agents.forEach(agent => {
      // Check if it's an alias or a placeholder for initial population
      const isAlias = agent.id === 'general' || agent.id === 'general-ai';
      const isPlaceholder = placeholderAgentIds.includes(agent.id);

      if (!isAlias && !isPlaceholder) { // Store all non-alias, non-placeholder agents
        if (!definedAgents.has(agent.id)) {
            definedAgents.set(agent.id, agent);
        }
      }
    });
    
    // Set canonical agents to the main map
    definedAgents.forEach((agentDef, agentId) => {
        this.agentsMap.set(agentId, agentDef);
    });

    console.log(`[AgentService] Initialized. Default Public: ${this.defaultPublicAgentId}, Default Private: ${this.defaultPrivateAgentId}`);
    console.log(`[AgentService] Total canonical agents loaded: ${Array.from(this.agentsMap.values()).filter(a => !placeholderAgentIds.includes(a.id) && a.id !== 'general' && a.id !== 'general-ai').length}`);
  }

  public getAgentById(id?: AgentId | null): IAgentDefinition | undefined {
    if (!id) return undefined;
    return this.agentsMap.get(id);
  }

  public getAllAgents(): IAgentDefinition[] {
    // Filter out placeholders and return unique canonical agents (aliases will resolve to their canonical here)
    const uniqueAgents = new Map<AgentId, IAgentDefinition>();
    this.agentsMap.forEach(agent => {
      if (!placeholderAgentIds.includes(agent.id)) {
        const canonicalId = (agent.id === 'general' || agent.id === 'general-ai') ? 'v_agent' : agent.id;
        const canonicalAgent = this.agentsMap.get(canonicalId); // Get the full canonical definition
        if (canonicalAgent && !uniqueAgents.has(canonicalId)) {
           uniqueAgents.set(canonicalId, canonicalAgent);
        }
      }
    });
    return Array.from(uniqueAgents.values()).sort((a,b) => a.label.localeCompare(b.label));
  }
  
  public getPublicAgents(): IAgentDefinition[] {
    return this.getAllAgents().filter(agent => agent.isPublic);
  }

  public getPrivateAgents(): IAgentDefinition[] {
    // Private agents are those not public OR those with a specific non-public accessTier
    return this.getAllAgents().filter(agent => !agent.isPublic || (agent.accessTier && agent.accessTier !== 'public'));
  }
  
  public getDefaultAgent(): IAgentDefinition { // For authenticated users (members/premium)
    let agent = this.getAgentById(this.defaultPrivateAgentId);
    if (agent && !placeholderAgentIds.includes(agent.id)) return agent;
    
    agent = this.getDefaultPublicAgent(); // Fallback to public default
    if (agent && !placeholderAgentIds.includes(agent.id)) return agent;
    
    // Absolute fallback to the first valid non-placeholder agent
    const firstValidAgent = Array.from(this.agentsMap.values()).find(a => a.systemPromptKey && !placeholderAgentIds.includes(a.id) && a.id !== 'general' && a.id !== 'general-ai');
    if (firstValidAgent) return firstValidAgent;

    throw new Error("CRITICAL: No valid default agent found in AgentService.");
  }

  public getDefaultPublicAgent(): IAgentDefinition {
    let agent = this.getAgentById(this.defaultPublicAgentId); // Should be 'v_agent' if defined correctly
    if (agent && agent.isPublic && !placeholderAgentIds.includes(agent.id)) return agent;
    
    // Fallback logic if 'v_agent' isn't suitable or defined
    const vAgent = this.agentsMap.get('v_agent');
    if (vAgent && vAgent.isPublic && !placeholderAgentIds.includes(vAgent.id)) return vAgent;

    const nerfAgent = this.agentsMap.get('v_agent'); // Next fallback: Nerf
    if (nerfAgent && nerfAgent.isPublic && !placeholderAgentIds.includes(nerfAgent.id)) return nerfAgent;

    const firstPublicInList = this.getPublicAgents().find(a => !placeholderAgentIds.includes(a.id));
    if (firstPublicInList) return firstPublicInList;

    throw new Error("CRITICAL: No public agents available in AgentService.");
  }
}

export const agentService = new AgentService();
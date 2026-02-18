/**
 * Inspirational Quotes System
 * @module lib/quarry/quotes
 * 
 * Curated collection of quotes about knowledge, learning, creativity, and exploration.
 * Displayed in the Codex sidebar to inspire users.
 */

export interface Quote {
  text: string
  author: string
  source?: string
  year?: number
  tags?: string[]
}

/**
 * Curated quotes about knowledge, learning, and creativity
 */
export const QUOTES: Quote[] = [
  // On Knowledge
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates", tags: ['wisdom', 'humility'] },
  { text: "Knowledge speaks, but wisdom listens.", author: "Jimi Hendrix", tags: ['wisdom'] },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", tags: ['knowledge', 'learning'] },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", tags: ['learning'] },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", tags: ['learning', 'life'] },
  
  // On Writing
  { text: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour", tags: ['writing', 'creativity'] },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou", tags: ['writing', 'stories'] },
  { text: "The first draft is just you telling yourself the story.", author: "Terry Pratchett", tags: ['writing'] },
  { text: "You can always edit a bad page. You can't edit a blank page.", author: "Jodi Picoult", tags: ['writing'] },
  { text: "Writing is thinking. To write well is to think clearly.", author: "David McCullough", tags: ['writing', 'thinking'] },
  
  // On Creativity
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein", tags: ['creativity', 'intelligence'] },
  { text: "The chief enemy of creativity is good sense.", author: "Pablo Picasso", tags: ['creativity'] },
  { text: "Every child is an artist. The problem is how to remain an artist once we grow up.", author: "Pablo Picasso", tags: ['creativity', 'art'] },
  { text: "Creativity takes courage.", author: "Henri Matisse", tags: ['creativity', 'courage'] },
  { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou", tags: ['creativity'] },
  
  // On Curiosity
  { text: "I have no special talents. I am only passionately curious.", author: "Albert Einstein", tags: ['curiosity'] },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein", tags: ['curiosity', 'questions'] },
  { text: "Curiosity is the wick in the candle of learning.", author: "William Arthur Ward", tags: ['curiosity', 'learning'] },
  { text: "Be curious, not judgmental.", author: "Walt Whitman", tags: ['curiosity'] },
  { text: "The cure for boredom is curiosity. There is no cure for curiosity.", author: "Dorothy Parker", tags: ['curiosity'] },
  
  // On Ideas
  { text: "Ideas are like rabbits. You get a couple and learn how to handle them, and pretty soon you have a dozen.", author: "John Steinbeck", tags: ['ideas'] },
  { text: "An idea that is not dangerous is unworthy of being called an idea at all.", author: "Oscar Wilde", tags: ['ideas'] },
  { text: "Ideas come from everything.", author: "Alfred Hitchcock", tags: ['ideas'] },
  { text: "New ideas pass through three periods: It can't be done. It probably can be done, but it's not worth doing. I knew it was a good idea all along!", author: "Arthur C. Clarke", tags: ['ideas', 'innovation'] },
  
  // On Reading
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin", tags: ['reading', 'life'] },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison", tags: ['reading'] },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss", tags: ['reading', 'knowledge'] },
  { text: "Books are a uniquely portable magic.", author: "Stephen King", tags: ['reading', 'books'] },
  { text: "I cannot remember the books I've read any more than the meals I have eaten; even so, they have made me.", author: "Ralph Waldo Emerson", tags: ['reading', 'growth'] },
  
  // On Thinking
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", tags: ['excellence', 'habits'] },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch", tags: ['mind', 'learning'] },
  { text: "Think left and think right and think low and think high.", author: "Dr. Seuss", tags: ['thinking'] },
  { text: "The world as we have created it is a process of our thinking.", author: "Albert Einstein", tags: ['thinking', 'reality'] },
  
  // On Documentation
  { text: "Documentation is a love letter that you write to your future self.", author: "Damian Conway", tags: ['documentation', 'code'] },
  { text: "Code tells you how; comments tell you why.", author: "Jeff Atwood", tags: ['documentation', 'code'] },
  { text: "Clear thinking becomes clear writing; one can't exist without the other.", author: "William Zinsser", tags: ['writing', 'thinking'] },
  
  // On Exploration
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", tags: ['exploration', 'journey'] },
  { text: "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.", author: "Marcel Proust", tags: ['discovery', 'perspective'] },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan", tags: ['discovery', 'science'] },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", tags: ['challenges', 'opportunity'] },
  
  // On Focus
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee", tags: ['focus', 'success'] },
  { text: "Concentrate all your thoughts upon the work at hand.", author: "Alexander Graham Bell", tags: ['focus'] },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins", tags: ['focus', 'energy'] },
  
  // On Growth
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", tags: ['work', 'passion'] },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", tags: ['persistence', 'progress'] },
  { text: "What we fear doing most is usually what we most need to do.", author: "Tim Ferriss", tags: ['fear', 'growth'] },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes", tags: ['learning', 'mastery'] },
  
  // Additional quotes for variety
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", tags: ['action', 'time'] },
  { text: "Knowledge is of no value unless you put it into practice.", author: "Anton Chekhov", tags: ['knowledge', 'action'] },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", tags: ['learning', 'teaching'] },
  { text: "The more I read, the more I acquire, the more certain I am that I know nothing.", author: "Voltaire", tags: ['reading', 'humility'] },
  { text: "A mind is like a parachute. It doesn't work if it is not open.", author: "Frank Zappa", tags: ['openness', 'mind'] },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt", tags: ['doubt', 'possibility'] },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats", tags: ['education', 'inspiration'] },
  { text: "In the beginner's mind there are many possibilities, but in the expert's there are few.", author: "Shunryu Suzuki", tags: ['beginners', 'mindset'] },
  { text: "The art of being wise is the art of knowing what to overlook.", author: "William James", tags: ['wisdom', 'focus'] },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci", tags: ['learning', 'mind'] },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle", tags: ['education', 'persistence'] },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", tags: ['simplicity', 'design'] },
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry", tags: ['goals', 'planning'] },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert", tags: ['learning', 'choice'] },
  { text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein", tags: ['wisdom', 'lifelong'] },
  { text: "To know that we know what we know, and to know that we do not know what we do not know, that is true knowledge.", author: "Nicolaus Copernicus", tags: ['knowledge', 'humility'] },
  { text: "The ink of the scholar is more sacred than the blood of the martyr.", author: "Prophet Muhammad", tags: ['knowledge', 'writing'] },
  { text: "I am still learning.", author: "Michelangelo", tags: ['learning', 'humility'] },
  { text: "What is written without effort is in general read without pleasure.", author: "Samuel Johnson", tags: ['writing', 'effort'] },
  { text: "The pen is mightier than the sword.", author: "Edward Bulwer-Lytton", tags: ['writing', 'power'] },
  { text: "Ideas are the beginning points of all fortunes.", author: "Napoleon Hill", tags: ['ideas', 'success'] },
  { text: "Imagination is the beginning of creation.", author: "George Bernard Shaw", tags: ['imagination', 'creativity'] },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", tags: ['action', 'beginning'] },
  { text: "To improve is to change; to be perfect is to change often.", author: "Winston Churchill", tags: ['change', 'improvement'] },
  { text: "Don't explain your philosophy. Embody it.", author: "Epictetus", tags: ['action', 'philosophy'] },
  { text: "Wonder is the beginning of wisdom.", author: "Socrates", tags: ['wonder', 'wisdom'] },
]

/**
 * Get a random quote
 */
export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}

/**
 * Get daily quote (consistent for the day, but rotates through collection)
 * Uses a combination of date and year to prevent same quote on same day each year
 */
export function getDailyQuote(): Quote {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const yearOffset = today.getFullYear() % 10 // Shift by year to vary across years
  const index = (dayOfYear + yearOffset * 37) % QUOTES.length // 37 is a prime for better distribution
  return QUOTES[index]
}

/**
 * Get a session-unique quote (changes each browser session)
 * Good for showing fresh content on page load without being too random
 */
export function getSessionQuote(): Quote {
  // Use a session-stable random that changes only on page reload
  const sessionSeed = typeof window !== 'undefined' 
    ? Math.floor(performance.now() / 1000) // Rough session identifier
    : Date.now()
  const index = sessionSeed % QUOTES.length
  return QUOTES[index]
}

/**
 * Get quotes by tag
 */
export function getQuotesByTag(tag: string): Quote[] {
  return QUOTES.filter(q => q.tags?.includes(tag))
}

/**
 * Get multiple random quotes
 */
export function getRandomQuotes(count: number): Quote[] {
  const shuffled = [...QUOTES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}













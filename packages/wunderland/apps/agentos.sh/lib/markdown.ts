import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = (() => {
  const pathsToTry = [
    path.join(process.cwd(), 'apps/agentos.sh/content'),
    path.join(process.cwd(), 'content')
  ];
  
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  return pathsToTry[0];
})();

export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
  excerpt?: string;
  author?: string;
  category?: string;
  image?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Job {
  slug: string;
  title: string;
  location: string;
  type: string;
  department: string;
  content: string;
  excerpt?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function getPostSlugs() {
  const dir = path.join(contentDirectory, 'blog');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(file => file.endsWith('.md'));
}

export function getPostBySlug(slug: string): Post | null {
  const realSlug = slug.replace(/\.md$/, '');
  const fullPath = path.join(contentDirectory, 'blog', `${realSlug}.md`);
  
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    title: data.title,
    date: data.date,
    content,
    excerpt: data.excerpt,
    author: data.author,
    category: data.category,
    image: data.image,
    ...data,
  };
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is Post => post !== null)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

export function getJobSlugs() {
  const dir = path.join(contentDirectory, 'careers');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(file => file.endsWith('.md'));
}

export function getJobBySlug(slug: string): Job | null {
  const realSlug = slug.replace(/\.md$/, '');
  const fullPath = path.join(contentDirectory, 'careers', `${realSlug}.md`);
  
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    title: data.title,
    location: data.location,
    type: data.type,
    department: data.department,
    content,
    excerpt: data.excerpt,
    ...data,
  };
}

export function getAllJobs(): Job[] {
  const slugs = getJobSlugs();
  const jobs = slugs
    .map((slug) => getJobBySlug(slug))
    .filter((job): job is Job => job !== null);
  return jobs;
}


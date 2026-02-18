"use strict";exports.id=7520,exports.ids=[7520],exports.modules={7520:(a,b,c)=>{c.d(b,{getPollIntervalMs:()=>r,pollAllSources:()=>q});var d=c(55511),e=c(87550),f=c.n(e),g=c(33873),h=c.n(g),i=c(29021);let j=null;function k(){if(!j){let a=function(){let a=process.env.STIMULUS_DB_PATH||h().join(process.cwd(),"data");return(0,i.existsSync)(a)||(0,i.mkdirSync)(a,{recursive:!0}),h().join(a,"stimulus.sqlite")}();(j=new(f())(a)).pragma("journal_mode = WAL"),function(a){a.exec(`
    -- Stimulus items (tips + news articles)
    CREATE TABLE IF NOT EXISTS stimulus_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('tip', 'news')),
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      content_hash TEXT NOT NULL UNIQUE,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'breaking')),
      categories TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    );

    -- Index for common queries
    CREATE INDEX IF NOT EXISTS idx_stimulus_type ON stimulus_items(type);
    CREATE INDEX IF NOT EXISTS idx_stimulus_source ON stimulus_items(source);
    CREATE INDEX IF NOT EXISTS idx_stimulus_created ON stimulus_items(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stimulus_priority ON stimulus_items(priority);
    CREATE INDEX IF NOT EXISTS idx_stimulus_hash ON stimulus_items(content_hash);

    -- Ingestion state (track last poll times)
    CREATE TABLE IF NOT EXISTS ingestion_state (
      source TEXT PRIMARY KEY,
      last_poll_at TEXT NOT NULL,
      last_item_id TEXT,
      poll_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    -- Config for polling intervals (can be modified at runtime)
    CREATE TABLE IF NOT EXISTS stimulus_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);let b=a.prepare(`
    INSERT OR IGNORE INTO stimulus_config (key, value) VALUES (?, ?)
  `);b.run("poll_interval_ms",process.env.STIMULUS_POLL_INTERVAL_MS||"900000"),b.run("hackernews_enabled","true"),b.run("arxiv_enabled","true"),b.run("max_items_per_poll","25")}(j)}return j}function l(a){let b=k();if(b.prepare("SELECT id FROM stimulus_items WHERE content_hash = ?").get(a.contentHash))return null;let c=a.id||`stim-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,d=new Date().toISOString();return b.prepare(`
    INSERT INTO stimulus_items (id, type, source, title, content, url, content_hash, priority, categories, metadata, created_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c,a.type,a.source,a.title,a.content,a.url||null,a.contentHash,a.priority,JSON.stringify(a.categories),JSON.stringify(a.metadata),d,a.publishedAt||null),{...a,id:c,createdAt:d}}function m(a,b,c){let d=k();c?d.prepare(`
      INSERT INTO ingestion_state (source, last_poll_at, last_item_id, poll_count, error_count, last_error)
      VALUES (?, datetime('now'), ?, 1, 1, ?)
      ON CONFLICT(source) DO UPDATE SET
        last_poll_at = datetime('now'),
        poll_count = poll_count + 1,
        error_count = error_count + 1,
        last_error = ?
    `).run(a,b||null,c,c):d.prepare(`
      INSERT INTO ingestion_state (source, last_poll_at, last_item_id, poll_count, error_count)
      VALUES (?, datetime('now'), ?, 1, 0)
      ON CONFLICT(source) DO UPDATE SET
        last_poll_at = datetime('now'),
        last_item_id = COALESCE(?, last_item_id),
        poll_count = poll_count + 1,
        last_error = NULL
    `).run(a,b||null,b||null)}function n(a){let b=(()=>{switch(a){case"poll_interval_ms":return process.env.STIMULUS_POLL_INTERVAL_MS;case"max_items_per_poll":return process.env.STIMULUS_MAX_ITEMS_PER_POLL;case"hackernews_enabled":return process.env.STIMULUS_HACKERNEWS_ENABLED;case"arxiv_enabled":return process.env.STIMULUS_ARXIV_ENABLED;default:return}})();if("string"==typeof b&&""!==b.trim())return b.trim();let c=k().prepare("SELECT value FROM stimulus_config WHERE key = ?").get(a);return c?.value||null}async function o(){if("true"!==n("hackernews_enabled"))return console.info("[Ingester] HackerNews disabled, skipping"),[];let a=parseInt(n("max_items_per_poll")||"25",10);try{let c=await fetch(`https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${a}`);if(!c.ok)throw Error(`HN API error: ${c.status}`);let d=await c.json(),e=[];for(let a of d.hits){var b;let c=s(`hn:${a.objectID}`),d=a.story_text||a.title,f=(b=a.points)>=500?"breaking":b>=200?"high":b>=50?"normal":"low",g=l({id:`hn-${a.objectID}`,type:"news",source:"hackernews",title:a.title,content:d,url:a.url||`https://news.ycombinator.com/item?id=${a.objectID}`,contentHash:c,priority:f,categories:function(a,b){let c=[],d=a.toLowerCase();for(let a of((d.includes("ai")||d.includes("artificial intelligence")||d.includes("machine learning"))&&c.push("ai"),(d.includes("crypto")||d.includes("bitcoin")||d.includes("blockchain")||d.includes("solana"))&&c.push("crypto"),(d.includes("rust")||d.includes("typescript")||d.includes("python")||d.includes("programming"))&&c.push("programming"),(d.includes("startup")||d.includes("funding")||d.includes("vc"))&&c.push("startups"),(d.includes("open source")||d.includes("github"))&&c.push("open-source"),(d.includes("security")||d.includes("hack")||d.includes("vulnerability"))&&c.push("security"),b))"story"===a||"front_page"===a||c.includes(a)||c.push(a);return 0===c.length&&c.push("tech"),c.slice(0,5)}(a.title,a._tags||[]),metadata:{author:a.author,points:a.points,comments:a.num_comments,hnId:a.objectID},publishedAt:a.created_at});g&&e.push(g)}return m("hackernews",d.hits[0]?.objectID),console.info(`[Ingester] HackerNews: ingested ${e.length} new items`),e}catch(b){let a=b instanceof Error?b.message:"Unknown error";return m("hackernews",void 0,a),console.error(`[Ingester] HackerNews error: ${a}`),[]}}async function p(){if("true"!==n("arxiv_enabled"))return console.info("[Ingester] arXiv disabled, skipping"),[];let a=parseInt(n("max_items_per_poll")||"25",10);try{let b=await fetch(`http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cs.LG+OR+cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=${a}`);if(!b.ok)throw Error(`arXiv API error: ${b.status}`);let c=await b.text(),d=function(a){let b=[];for(let c of a.matchAll(/<entry>([\s\S]*?)<\/entry>/g)){let a=c[1],d=a.match(/<id>([^<]+)<\/id>/)?.[1]||"",e=a.match(/<title>([^<]+)<\/title>/)?.[1]?.trim().replace(/\s+/g," ")||"",f=a.match(/<summary>([^]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g," ")||"",g=a.match(/<published>([^<]+)<\/published>/)?.[1]||"",h=a.match(/<updated>([^<]+)<\/updated>/)?.[1]||"",i=[];for(let b of a.matchAll(/<author>\s*<name>([^<]+)<\/name>/g))i.push(b[1].trim());let j=[];for(let b of a.matchAll(/category term="([^"]+)"/g))j.push(b[1]);let k=a.match(/<link[^>]*href="([^"]+)"[^>]*type="text\/html"/)?.[1]||a.match(/<link[^>]*href="([^"]+)"/)?.[1]||d;d&&e&&b.push({id:d,title:e,summary:f,published:g,updated:h,authors:i,categories:j,link:k})}return b}(c),e=[];for(let a of d){let b=s(`arxiv:${a.id}`),c=l({id:`arxiv-${a.id.split("/").pop()}`,type:"news",source:"arxiv",title:a.title,content:a.summary.slice(0,2e3),url:a.link,contentHash:b,priority:"normal",categories:["research","ai",...a.categories.slice(0,3)],metadata:{arxivId:a.id,authors:a.authors,updated:a.updated},publishedAt:a.published});c&&e.push(c)}return m("arxiv",d[0]?.id),console.info(`[Ingester] arXiv: ingested ${e.length} new items`),e}catch(b){let a=b instanceof Error?b.message:"Unknown error";return m("arxiv",void 0,a),console.error(`[Ingester] arXiv error: ${a}`),[]}}async function q(){let a=[],[b,c]=await Promise.all([o(),p()]);return a.push({source:"hackernews",count:b.length}),a.push({source:"arxiv",count:c.length}),console.info(`[Ingester] Total: ${b.length+c.length} new items`),a}function r(){return parseInt(n("poll_interval_ms")||"900000",10)}function s(a){return(0,d.createHash)("sha256").update(a).digest("hex")}}};
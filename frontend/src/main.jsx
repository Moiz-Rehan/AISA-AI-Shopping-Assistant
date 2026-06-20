import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, formatPrice } from './api.js';
import './styles.css';

const navItems = [
  ['Dashboard', '/dashboard'],
  ['Favorites', '/favorites'],
  ['History', '/history'],
  ['Compare', '/compare'],
  ['Alerts', '/alerts'],
  ['Admin', '/admin'],
];

const quickSearches = ['mouse under 3k', 'keyboard under 5k', 'earbuds under 10000', 'laptop under 2 lakh', 'gaming laptop under 3 lakh'];

function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    location.href = '/';
  }

  return <>
    <header className="topbar">
      <div className="topbarInner">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <span className="brandIcon">A</span>
          <span><b>AISA</b><small>AI Shopping Assistant</small></span>
        </Link>

        <button className="mobileMenu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>

        <nav className={`navlinks ${menuOpen ? 'open' : ''}`}>
          {navItems.map(([label, href]) => <NavLink key={href} to={href} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
        </nav>

        <div className="navActions">
          <button className="iconBtn" onClick={() => setDark(!dark)} title="Theme">{dark ? '☀️' : '🌙'}</button>
          {user ? <>
            <span className="userPill">{user.username || user.email}</span>
            <button className="btn small" onClick={logout}>Logout</button>
          </> : <Link className="btn small" to="/login">Login</Link>}
        </div>
      </div>
    </header>
    <main>{children}</main>
    <footer className="footer">AISA · AI product search · price comparison · smart recommendations</footer>
  </>;
}

function SearchBox({ initial = '', compact = false }) {
  const [q, setQ] = useState(initial);
  const [suggestions, setSuggestions] = useState([]);
  const nav = useNavigate();

  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim()) api(`/api/search/suggestions?q=${encodeURIComponent(q)}`).then((d) => setSuggestions(d.suggestions || [])).catch(() => {});
      else setSuggestions([]);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function submit(e) {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return <div className={`searchShell ${compact ? 'compact' : ''}`}>
    <form onSubmit={submit} className="searchBox">
      <span className="searchIcon">⌕</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products e.g. mouse under 3k" />
      <button className="btn">AI Search</button>
      {suggestions.length > 0 && <div className="suggestions">
        {suggestions.map((s) => <button key={s} type="button" onClick={() => { setQ(s); nav(`/search?q=${encodeURIComponent(s)}`); }}>{s}</button>)}
      </div>}
    </form>
    {!compact && <div className="quickSearches">{quickSearches.map((s) => <button key={s} onClick={() => nav(`/search?q=${encodeURIComponent(s)}`)}>{s}</button>)}</div>}
  </div>;
}

function Home() {
  return <section className="heroPage">
    <div className="heroGrid">
      <div className="heroCopy">
        <div className="eyebrow"><span></span> AI + Scraping + Pakistani price comparison</div>
        <h1>Search smarter. Compare faster. Buy better.</h1>
        <p>AISA understands normal language like <b>“mouse under 3k”</b>, filters by budget, ranks products with AI, and opens seller pages for quick verification.</p>
        <SearchBox />
        <div className="trustRow">
          <Trust title="AI Query" text="Budget, category and keywords" />
          <Trust title="Fresh Cache" text="Fast repeat searches" />
          <Trust title="Seller Links" text="Amazon, Daraz, OLX, eBay" />
        </div>
      </div>
      <div className="heroPanel card">
        <div className="panelHeader"><span className="dot green"></span><span className="dot yellow"></span><span className="dot red"></span></div>
        <div className="mockSearch">gaming laptop under 3 lakh</div>
        <div className="mockCard hot"><span>Best value</span><b>Acer Nitro 5 GTX 1650</b><strong>PKR 145,000</strong></div>
        <div className="mockCard"><span>AI Score</span><b>Relevance + price + rating</b><strong>89%</strong></div>
        <div className="mockCard"><span>Cache</span><b>Served from fresh cache</b><strong>6h TTL</strong></div>
      </div>
    </div>
    <div className="featureGrid">
      <Info icon="🧠" title="Gemini AI Analysis" text="Search intent, budget and category are cleaned before scraping." />
      <Info icon="🛒" title="Multi-Platform Results" text="Products are collected from configured seller sources and normalized to PKR." />
      <Info icon="📊" title="AI Ranking" text="Relevance, price, rating, reviews and availability are scored together." />
      <Info icon="🔔" title="Alerts & Favorites" text="Save products, create alerts and compare your shortlisted items." />
    </div>
  </section>;
}

function Trust({ title, text }) { return <div><b>{title}</b><span>{text}</span></div>; }
function Info({ icon = '✓', title, text }) { return <div className="card infoCard"><div className="infoIcon">{icon}</div><h3>{title}</h3><p>{text}</p></div>; }

function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [state, setState] = useState({ loading: true, products: [], ai: null, analysis: null, error: '' });
  const [sort, setSort] = useState('score');
  const [platform, setPlatform] = useState('all');
  const [compare, setCompare] = useState(() => JSON.parse(localStorage.getItem('compare') || '[]'));

  useEffect(() => {
    if (!q) return;
    setState({ loading: true, products: [], ai: null, analysis: null, error: '' });
    api('/api/search', { method: 'POST', body: { q } })
      .then((d) => setState({ loading: false, products: d.products || [], ai: d.ai, analysis: d.analysis, error: '' }))
      .catch((e) => setState({ loading: false, products: [], ai: null, analysis: null, error: e.message }));
  }, [q]);

  useEffect(() => localStorage.setItem('compare', JSON.stringify(compare.slice(0, 4))), [compare]);

  const products = useMemo(() => {
    let list = [...state.products];
    if (platform !== 'all') list = list.filter((p) => p.platform === platform);
    if (sort === 'price') list.sort((a,b) => Number(a.normalized_price_pkr) - Number(b.normalized_price_pkr));
    if (sort === 'rating') list.sort((a,b) => Number(b.rating) - Number(a.rating));
    if (sort === 'score') list.sort((a,b) => Number(b.ai_score) - Number(a.ai_score));
    return list;
  }, [state.products, sort, platform]);

  const platforms = ['all', ...new Set(state.products.map((p) => p.platform))];
  const nearCount = state.products.filter((p) => p.is_near_match).length;

  function toggleCompare(p) {
    setCompare((old) => old.some((x) => x.id === p.id) ? old.filter((x) => x.id !== p.id) : [...old, p].slice(0, 4));
  }

  return <section className="page searchPage">
    <div className="pageHeader">
      <div><span className="sectionLabel">Product Search</span><h1>Search results</h1><p>{q ? `Query: ${q}` : 'Enter a product query to start.'}</p></div>
      <Link className="ghost" to="/dashboard">View dashboard</Link>
    </div>

    <SearchBox initial={q} compact />
    {state.loading && <Loader />}
    {state.error && <div className="error">{state.error}</div>}
    {!state.loading && state.ai && <AIPanel ai={state.ai} analysis={state.analysis} count={state.products.length} nearCount={nearCount} />}

    {!state.loading && <div className="toolbar card">
      <div className="filterGroup"><label>Sort by</label><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="score">AI score</option><option value="price">Lowest price</option><option value="rating">Highest rating</option></select></div>
      <div className="filterGroup"><label>Platform</label><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{platforms.map((p) => <option key={p} value={p}>{p === 'all' ? 'All platforms' : p}</option>)}</select></div>
      <Link className="btn small" to="/compare">Compare ({compare.length})</Link>
    </div>}

    {!state.loading && products.length === 0 && <Empty />}
    <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} onCompare={() => toggleCompare(p)} comparing={compare.some((x) => x.id === p.id)} />)}</div>
  </section>;
}

function AIPanel({ ai, analysis, count, nearCount = 0 }) {
  return <div className="aiPanel card">
    <div className="aiTitle"><span>✨ AI Analysis</span><b>{count} results</b></div>
    <div className="analysisMeta">
      <span>Query: {analysis?.processedQuery || '-'}</span>
      <span>Category: {analysis?.category || '-'}</span>
      {nearCount > 0 && <span className="warningTag">{nearCount} near match</span>}
    </div>
    <p>{ai.commentary}</p>
    {ai.caveats?.length ? <small>{ai.caveats.join(' • ')}</small> : null}
  </div>;
}
function Loader() { return <div className="loader card"><span></span><h3>Searching products with AI...</h3><p>Scraping, cache check and ranking are in progress.</p></div>; }
function Empty() { return <div className="empty card"><h2>No exact result found</h2><p>Budget thora increase karein ya query simple karein. Near matches will appear when available.</p></div>; }

function ProductCard({ product, onCompare = () => {}, comparing = false }) {
  const [fav, setFav] = useState(!!product.is_favorite);
  async function toggleFav() {
    try {
      if (fav) await api(`/api/favorites/${product.id}`, { method: 'DELETE' });
      else await api('/api/favorites', { method: 'POST', body: { productId: product.id } });
      setFav(!fav);
    } catch (e) { alert('Login required for favorites'); }
  }

  return <article className="product card">
    <div className="productImageWrap">
      <img src={product.image_url} alt={product.name} onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x420?text=AISA+Product'; }} />
      {product.is_near_match && <span className="floatingTag">Above budget</span>}
    </div>
    <div className="productMeta"><span className="platformTag">{product.platform}</span><span className="score">AI {Math.round(Number(product.ai_score || 0)*100)}%</span></div>
    <h3><Link to={`/product/${product.id}`}>{product.name}</Link></h3>
    <div className="price">{formatPrice(product.normalized_price_pkr)}</div>
    <p className="muted">⭐ {product.rating || 0} · {product.reviews || 0} reviews · {product.availability}</p>
    <p className="reason">{product.ai_reason}</p>
    <div className="actions"><button className="ghost" onClick={toggleFav}>{fav ? '♥ Saved' : '♡ Save'}</button><button className="ghost" onClick={onCompare}>{comparing ? '✓ Added' : '+ Compare'}</button></div>
  </article>;
}

function ProductPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/api/products/${id}`).then(setData).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <section className="page"><div className="error">{err}</div></section>;
  if (!data) return <section className="page"><Loader /></section>;
  const p = data.product;
  return <section className="page productDetail">
    <div className="detailHero card">
      <img className="bigImg" src={p.image_url} onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x600?text=AISA+Product'; }} />
      <div>
        <span className="platformTag">{p.platform}</span>
        <h1>{p.name}</h1>
        <div className="price xl">{formatPrice(p.normalized_price_pkr)}</div>
        <p className="reason large">{p.ai_reason}</p>
        <div className="detailStats"><Trust title="AI Score" text={`${Math.round(Number(p.ai_score)*100)}%`} /><Trust title="Rating" text={`${p.rating || 0} stars`} /><Trust title="Reviews" text={p.reviews || 0} /></div>
        <a className="btn" href={p.url} target="_blank">Open seller page</a>
      </div>
    </div>
    <div className="featureGrid two">
      <div className="card"><h2>AI Verdict</h2><p>Ye product relevance, price, rating aur availability ke hisaab se ranked hai. Final purchase se pehle seller website par price, stock aur delivery verify karein.</p></div>
      <div className="card"><h2>Similar Products</h2>{data.similar.length ? data.similar.map((s) => <p key={s.id}><Link to={`/product/${s.id}`}>{s.name}</Link> — {formatPrice(s.normalized_price_pkr)}</p>) : <p className="muted">No similar product available yet.</p>}</div>
    </div>
  </section>;
}

function AuthPage({ mode }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await api(`/api/auth/${mode}`, { method: 'POST', body: form }); nav('/dashboard'); }
    catch(e) { setErr(e.message); }
  }
  const isLogin = mode === 'login';
  return <section className="authPage">
    <div className="authCard card">
      <div className="authVisual">
        <span className="brandIcon large">A</span>
        <h2>{isLogin ? 'Welcome back to AISA' : 'Create your AISA account'}</h2>
        <p>Save favorites, track search history, compare products and manage price alerts.</p>
        <div className="authChecklist"><span>✓ Secure password hash</span><span>✓ Personal dashboard</span><span>✓ Favorites & alerts</span></div>
      </div>
      <div className="authFormWrap">
        <span className="sectionLabel">{isLogin ? 'Login' : 'Register'}</span>
        <h1>{isLogin ? 'Sign in to continue' : 'Start shopping smarter'}</h1>
        <form onSubmit={submit} className="form">
          {!isLogin && <input placeholder="Username" value={form.username} onChange={(e) => setForm({...form, username:e.target.value})} />}
          <input placeholder="Email address" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password:e.target.value})} />
          {err && <div className="error slim">{err}</div>}
          <button className="btn full">{isLogin ? 'Login' : 'Create account'}</button>
        </form>
        <p className="muted authSwitch">{isLogin ? <>No account? <Link to="/register">Create account</Link></> : <>Already have account? <Link to="/login">Login</Link></>}</p>
      </div>
    </div>
  </section>;
}

function Dashboard() {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/api/dashboard/me').then(setData).catch((e) => setErr(e.message)); }, []);
  return <section className="page"><div className="pageHeader"><div><span className="sectionLabel">Overview</span><h1>Dashboard</h1><p>Your shopping activity and saved insights.</p></div></div>{err && <div className="error">{err}</div>}{data && <><div className="statsGrid"><Stat title="Searches" value={data.stats.searches} hint="Total searches" /><Stat title="Favorites" value={data.stats.favorites} hint="Saved products" /><Stat title="Alerts" value={data.stats.alerts} hint="Active reminders" /></div><div className="card tableCard"><h2>Recent Searches</h2>{data.recent.length ? data.recent.map((r) => <div className="tableRow" key={r.id}><Link to={`/search?q=${encodeURIComponent(r.query)}`}>{r.query}</Link><span>{r.results_count} results</span></div>) : <p className="muted">No recent searches yet.</p>}</div></>}</section>;
}

function Stat({ title, value, hint }) { return <div className="stat card"><span>{title}</span><strong>{value}</strong><p>{hint}</p></div>; }

function Favorites() {
  const [products, setProducts] = useState([]); const [err, setErr] = useState('');
  useEffect(() => { api('/api/favorites').then((d) => setProducts(d.products)).catch((e) => setErr(e.message)); }, []);
  return <section className="page"><div className="pageHeader"><div><span className="sectionLabel">Saved</span><h1>Favorites</h1></div></div>{err && <div className="error">{err}</div>}<div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>;
}

function History() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  useEffect(() => { api('/api/history').then((d) => setRows(d.history)).catch((e) => setErr(e.message)); }, []);
  return <section className="page"><div className="pageHeader"><div><span className="sectionLabel">Activity</span><h1>Search History</h1></div></div>{err && <div className="error">{err}</div>}<div className="card tableCard">{rows.length ? rows.map((r) => <div className="tableRow" key={r.id}><Link to={`/search?q=${encodeURIComponent(r.query)}`}>{r.query}</Link><span>{r.category} · {r.results_count} results</span></div>) : <p className="muted">No history found.</p>}</div></section>;
}

function Compare() {
  const items = JSON.parse(localStorage.getItem('compare') || '[]');
  return <section className="page"><div className="pageHeader"><div><span className="sectionLabel">Shortlist</span><h1>Compare Products</h1><p>Compare up to 4 products side by side.</p></div></div>{items.length < 2 && <p className="muted">Search page se 2 products compare mein add karein.</p>}<div className="compare">{items.map((p) => <div className="card compareCard" key={p.id}><span className="platformTag">{p.platform}</span><h3>{p.name}</h3><div className="price">{formatPrice(p.normalized_price_pkr)}</div><p>AI Score: {Math.round(Number(p.ai_score)*100)}%</p><p>Rating: {p.rating}</p><p>{p.ai_reason}</p></div>)}</div></section>;
}

function Alerts() {
  const [alerts, setAlerts] = useState([]); const [target, setTarget] = useState(''); const [queryText, setQueryText] = useState(''); const [err, setErr] = useState('');
  async function load() { api('/api/alerts').then((d) => setAlerts(d.alerts)).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);
  async function add(e) { e.preventDefault(); await api('/api/alerts', { method:'POST', body:{ query: queryText, targetPricePkr: target }}); setTarget(''); setQueryText(''); load(); }
  return <section className="page"><div className="pageHeader"><div><span className="sectionLabel">Notifications</span><h1>Price Alerts</h1><p>Create target price alerts for future checks.</p></div></div>{err && <div className="error">{err}</div>}<form className="toolbar card" onSubmit={add}><input placeholder="Query e.g. gaming laptop" value={queryText} onChange={(e)=>setQueryText(e.target.value)} /><input placeholder="Target price PKR" value={target} onChange={(e)=>setTarget(e.target.value)} /><button className="btn">Add Alert</button></form><div className="card tableCard">{alerts.length ? alerts.map((a) => <div className="tableRow" key={a.id}><span>{a.query || a.name}</span><b>Target: {formatPrice(a.target_price_pkr)} · {a.is_active ? 'Active' : 'Off'}</b></div>) : <p className="muted">No alerts created.</p>}</div></section>;
}

function Admin() {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/api/admin/stats').then(setData).catch((e) => setErr(e.message)); }, []);
  async function makeAdmin() { await api('/api/auth/make-demo-admin', { method:'POST' }); location.reload(); }
  return <section className="page"><div className="pageHeader"><div><span className="sectionLabel">System</span><h1>Admin Panel</h1><p>Monitor database, cache and platform scraping status.</p></div></div>{err && <div className="error">{err}<br/><button className="btn small" onClick={makeAdmin}>Make my account demo admin</button></div>}{data && <><div className="statsGrid fourCols"><Stat title="Users" value={data.stats.users} hint="Registered" /><Stat title="Products" value={data.stats.products} hint="Stored listings" /><Stat title="Searches" value={data.stats.searches} hint="Total queries" /><Stat title="Fresh Cache" value={data.stats.fresh_cache} hint="Fast responses" /></div><div className="card tableCard"><h2>Platform Status</h2>{data.platforms.map((p) => <div className="tableRow" key={p.platform}><b>{p.platform}</b><span>{p.status} — {p.message}</span></div>)}</div></>}</section>;
}

function App() {
  return <BrowserRouter><Layout><Routes><Route path="/" element={<Home />} /><Route path="/search" element={<SearchPage />} /><Route path="/product/:id" element={<ProductPage />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/favorites" element={<Favorites />} /><Route path="/history" element={<History />} /><Route path="/compare" element={<Compare />} /><Route path="/alerts" element={<Alerts />} /><Route path="/admin" element={<Admin />} /></Routes></Layout></BrowserRouter>;
}

createRoot(document.getElementById('root')).render(<App />);

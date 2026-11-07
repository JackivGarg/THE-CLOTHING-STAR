import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import './discovery.css';
import {Garment} from './Garment';
import {BrandWorld} from './BrandWorld';

type Variant = {id?: string; size: string | null; colour: string | null; price_minor: number; available?: boolean | null};
type Product = {id: string; brand: string; title: string; category?: string; source_url?: string | null; image_url?: string | null; observed_at?: string | null; selected_variant: Variant; synthetic?: boolean};
type Results = {mode: string; filters: Record<string, string | number>; confirmed: Product[]; unknownDelivery: Product[]; coverage: string; total: number; page: number; hasMore: boolean};
type Brand = {slug: string; name: string; product_count?: number};
type SearchForm = {
  query: string; queryMode: 'requirements' | 'title'; category: string; brand: string; size: string;
  colour: string; budget: string; priceMode: 'delivered' | 'item'; sort: 'price-asc' | 'price-desc';
};
const initial: SearchForm = {query:'', queryMode:'requirements', category:'', brand:'', size:'', colour:'', budget:'', priceMode:'delivered', sort:'price-asc'};
const categories: Record<string, string> = {
  hoodie:'Hoodies', tee:'T-shirts', sweatshirt:'Sweatshirts', sweater:'Sweaters', shirt:'Shirts',
  jeans:'Jeans', trousers:'Trousers', shorts:'Shorts', jacket:'Jackets', vest:'Vests',
  dress:'Dresses', skirt:'Skirts', co_ord:'Co-ords',
};
const colours = ['Black','White','Blue','Red','Green','Brown','Pink','Beige','Grey','Navy','Cream','Olive','Purple','Yellow','Orange','Maroon','Indigo','Charcoal'];
const money = (minor: number) => '₹' + (minor / 100).toLocaleString('en-IN');
const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

function ProductVisual({product}: {product: Product}) {
  const [failed, setFailed] = useState(false);
  return product.image_url && !failed
    ? <img className="product-photo" src={product.image_url} alt={product.title} onError={() => setFailed(true)} loading="lazy"/>
    : <><Garment category={product.category ?? 'tee'} tone="#9da595"/><span>Illustration · photo unavailable</span></>;
}

function ProductCard({product, added, full, toggle}: {product: Product; added: boolean; full: boolean; toggle: () => void}) {
  const variant = product.selected_variant;
  return <article className="product">
    <div className="product-art"><ProductVisual key={product.image_url} product={product}/></div>
    <div className="product-meta"><span>{product.brand}</span>{product.synthetic && <span>Example</span>}</div>
    <h3>{product.title}</h3>
    <p className="product-price">{money(variant.price_minor)} <small>item price</small></p>
    <p className="variant-info">{[variant.size && 'Size ' + variant.size, variant.colour].filter(Boolean).join(' · ') || 'Size and colour unavailable'}</p>
    <p className="checked-time">{product.observed_at ? 'Stock observed ' + new Date(product.observed_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : 'Stock date unavailable'}</p>
    <div className="result-actions">
      {product.source_url && !product.synthetic && <a className="merchant-link" href={product.source_url} target="_blank" rel="noopener noreferrer">View at brand <Arrow/></a>}
      <button className="card-compare" type="button" disabled={full && !added} aria-pressed={added} aria-label={'Compare ' + product.title} onClick={toggle}>{added ? 'Added ✓' : '+ Compare'}</button>
    </div>
  </article>;
}

function App() {
  const [view, setView] = useState<'discover' | 'brands'>('discover');
  const [form, setForm] = useState<SearchForm>(initial);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsError, setBrandsError] = useState('');
  const [activeBrand, setActiveBrand] = useState('');
  const [result, setResult] = useState<Results | null>(null);
  const [submitted, setSubmitted] = useState<SearchForm | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('');
  const [compare, setCompare] = useState<Product[]>([]);
  const [following, setFollowing] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('star-brands') || '[]');
      return Array.isArray(saved) ? saved.filter(value => typeof value === 'string') : [];
    } catch { return []; }
  });
  const request = useRef<AbortController | null>(null);
  const update = <K extends keyof SearchForm>(key: K, value: SearchForm[K]) => {
    setForm(current => ({...current, [key]:value}));
    setError('');
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/brands', {signal:controller.signal}).then(async response => {
      if (!response.ok) throw Error('Brand list unavailable');
      const data = await response.json();
      setBrands(data.brands ?? []);
      setMode(data.mode ?? '');
    }).catch(() => {
      if (!controller.signal.aborted) setBrandsError('Brand list is unavailable right now. You can still search across the catalogue.');
    });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);

  function navigate(target: 'discover' | 'brands', section?: string) {
    setView(target);
    requestAnimationFrame(() => {
      if (section) document.getElementById(section)?.scrollIntoView({behavior:motion(), block:'start'});
      else window.scrollTo({top:0, behavior:'instant'});
    });
  }

  async function run(values: SearchForm, page = 1) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (page === 1) {
      setForm(values);
      setResult(null);
      setSubmitted(null);
    }
    setView('discover');
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/search', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        signal:controller.signal,
        body:JSON.stringify({
          query:values.query.trim(), queryMode:values.queryMode, page, sort:values.sort,
          filters:{
            brand:values.brand || undefined, category:values.category || undefined,
            size:values.size.trim() || undefined, colour:values.colour || undefined,
            budget:values.budget ? Math.round(Number(values.budget) * 100) : undefined,
            priceMode:values.priceMode,
          },
        }),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw Error('The catalogue connection is unavailable. Try again in a moment.');
      const data: Results & {error?: string} = await response.json();
      if (!response.ok) throw Error(data.error || 'Search is temporarily unavailable. Try again.');
      if (controller.signal.aborted) return;
      setResult(previous => page > 1 && previous
        ? {...data, confirmed:[...previous.confirmed,...data.confirmed], unknownDelivery:[...previous.unknownDelivery,...data.unknownDelivery]}
        : data);
      setSubmitted(values);
      if (page === 1) requestAnimationFrame(() => {
        const heading = document.getElementById('results-title');
        heading?.focus({preventScroll:true});
        heading?.scrollIntoView({behavior:motion(), block:'start'});
      });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Search is unavailable.');
    } finally {
      if (request.current === controller && !controller.signal.aborted) setLoading(false);
    }
  }

  function browseBrand(slug: string) {
    navigate('discover','find-your-fit');
    void run({...initial, brand:slug});
  }

  function toggleFollow(slug: string) {
    const next = following.includes(slug) ? following.filter(value => value !== slug) : [...following,slug];
    setFollowing(next);
    try { localStorage.setItem('star-brands', JSON.stringify(next)); } catch {}
  }

  function toggleCompare(product: Product) {
    setCompare(current => current.some(item => item.id === product.id)
      ? current.filter(item => item.id !== product.id)
      : current.length < 3 ? [...current, product] : current);
  }

  const shown = (result?.confirmed.length ?? 0) + (result?.unknownDelivery.length ?? 0);
  const pendingEdits = submitted && Object.keys(initial).some(key => form[key as keyof SearchForm] !== submitted[key as keyof SearchForm]);
  const chips = result ? Object.entries(result.filters).flatMap(([key,value]) => {
    if (value == null || key === 'priceMode') return [];
    if (key === 'budget') return ['Up to ' + money(Number(value)) + (result.filters.priceMode === 'item' ? ' item price' : ' delivered')];
    if (key === 'size') return ['Size ' + value];
    if (key === 'category') return [categories[value] ?? String(value)];
    if (key === 'title') return ['Name: ' + value];
    return [String(value)];
  }) : [];

  function cards(products: Product[]) {
    return <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product}
      added={compare.some(item => item.id === product.id)} full={compare.length >= 3} toggle={() => toggleCompare(product)}/>)}</div>;
  }

  return <>
    <header className="site-header">
      <a className="wordmark" href="/">THE CLOTHING <b>STAR</b><span className="logo-dot"/></a>
      <nav aria-label="Main navigation">
        <button aria-current={view === 'discover' ? 'page' : undefined} onClick={() => navigate('discover')}>Discover</button>
        <button onClick={() => navigate('discover','find-your-fit')}>Search</button>
        <button aria-current={view === 'brands' ? 'page' : undefined} onClick={() => {setActiveBrand(''); navigate('brands');}}>Brand radar</button>
      </nav>
    </header>
    {view === 'discover' ? <main>
      <BrandWorld brands={brands} onBrandExplore={browseBrand} onSearch={() => navigate('discover','find-your-fit')}
        onBrandInsights={slug => {setActiveBrand(slug); navigate('brands','brand-'+slug);}}/>
      <section className="search-section" id="find-your-fit" aria-labelledby="find-title">
        <div className="search-intro">
          <span className="search-eyebrow">THE PERSONAL SHORTLIST</span>
          <h2 id="find-title">Find your fit.</h2>
          <p>Describe what you want, search an item by name, or use the filters on their own.</p>
        </div>
        <form className="finder-form" onSubmit={event => {event.preventDefault(); void run(form);}}>
          <fieldset className="search-mode"><legend>Search by</legend>
            <label><input type="radio" name="query-mode" checked={form.queryMode === 'requirements'} onChange={() => update('queryMode','requirements')}/> What I want</label>
            <label><input type="radio" name="query-mode" checked={form.queryMode === 'title'} onChange={() => update('queryMode','title')}/> Product name</label>
          </fieldset>
          <label htmlFor="find">{form.queryMode === 'title' ? 'Product name' : 'What are you looking for?'}</label>
          <input className="finder-input" id="find" value={form.query} onChange={event => update('query',event.target.value)}
            maxLength={300} placeholder={form.queryMode === 'title' ? 'Tomato Girl' : 'Hoodie under ₹1,500, size M'}/>
          <div className="search-filters">
            <label>Category<select value={form.category} onChange={event => update('category',event.target.value)}>
              <option value="">From search or any</option>{Object.entries(categories).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Brand<select value={form.brand} onChange={event => update('brand',event.target.value)}>
              <option value="">All brands</option>{brands.map(brand => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}
            </select></label>
            <label>Size<input list="catalogue-sizes" value={form.size} maxLength={24} placeholder="e.g. M or 32" onChange={event => update('size',event.target.value)}/></label>
            <datalist id="catalogue-sizes">{['XS','S','M','L','XL','2XL','3XL','28','30','32','34','36','38'].map(size => <option key={size} value={size}/>)}</datalist>
            <label>Colour<select value={form.colour} onChange={event => update('colour',event.target.value)}>
              <option value="">From search or any</option>{colours.map(colour => <option key={colour} value={colour.toLowerCase()}>{colour}</option>)}
            </select></label>
            <label>Max budget (₹)<input type="number" min="1" max="1000000" step="1" value={form.budget} placeholder="From search or any" onChange={event => update('budget',event.target.value)}/></label>
            <label>Budget covers<select value={form.priceMode} onChange={event => update('priceMode',event.target.value as SearchForm['priceMode'])}>
              <option value="delivered">Item + delivery</option><option value="item">Item price only</option>
            </select></label>
          </div>
          <p className="finder-help">Filters you set here take priority over details typed in the search.</p>
          {brandsError && <p className="finder-help">{brandsError}</p>}
          {error && !result && <p role="alert" className="error-message">{error}</p>}
          <div className="finder-actions">
            <button className="finder-submit" disabled={loading}>{loading && !result ? 'Searching…' : 'Search catalogue'} <Arrow/></button>
            <button type="button" className="finder-clear" onClick={() => {
              request.current?.abort(); setLoading(false); setForm(initial); setError(''); setResult(null); setSubmitted(null);
            }}>Clear search</button>
          </div>
          <div className="search-examples">{['Hoodie under 1500 size M','Jeans size 32','Black T-shirt'].map(query =>
            <button type="button" key={query} disabled={loading} onClick={() => void run({...initial,query})}>{query}</button>)}</div>
        </form>
      </section>
      {(result || loading) && <section id="results" className="results-section" aria-busy={loading} aria-labelledby="results-title">
        <div className="section-heading">
          <div><h2 id="results-title" tabIndex={-1}>{result ? result.total.toLocaleString('en-IN') + (result.total === 1 ? ' match' : ' matches') : 'Searching the catalogue'}</h2>
            {result && <p>{result.coverage}</p>}</div>
          {result && submitted && <div className="results-tools"><button type="button" className="finder-clear" onClick={() => navigate('discover','find-your-fit')}>Edit search ↑</button><label className="budget-control">Sort by
            <select value={submitted.sort} disabled={loading || !!pendingEdits} onChange={event => void run({...submitted, sort:event.target.value as SearchForm['sort']})}>
              <option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option>
            </select>
          </label></div>}
        </div>
        {chips.length > 0 && <div className="filter-chips" aria-label="Applied filters">{chips.map((chip,index) => <span key={chip+index}>{chip}</span>)}</div>}
        {pendingEdits && <p className="source-notice">You’ve changed the filters. Search again to update these results.</p>}
        {result?.confirmed.length ? cards(result.confirmed) : null}
        {result?.unknownDelivery.length ? <div className="delivery-group"><h3>Delivery cost unknown</h3>
          <p>These item prices are within your budget. Check shipping with the brand before deciding.</p>
          {cards(result.unknownDelivery)}
        </div> : null}
        {loading && <p className="loading-state" role="status">{result ? 'Loading more matches…' : 'Finding matching items…'}</p>}
        {!loading && result?.total === 0 && <div className="empty-state"><h3>No matches for this combination.</h3>
          <p>Try another size or colour, remove a filter, or change your budget.</p>
          <button type="button" className="finder-clear" onClick={() => navigate('discover','find-your-fit')}>Edit search ↑</button>
        </div>}
        {error && result && <p role="alert" className="error-message">{error}</p>}
        {!!shown && result && <div className="results-footer">
          <span>Showing {shown} of {result.total.toLocaleString('en-IN')}</span>
          {result.hasMore && submitted && <button className="finder-clear" disabled={loading || !!pendingEdits} onClick={() => void run(submitted,result.page+1)}>Show 5 more</button>}
        </div>}
      </section>}
    </main> : <main className="brand-page">
      <div className="brand-title"><h1>Brand radar</h1><p>Explore a brand’s catalogue and keep favourites on this browser.</p></div>
      {brandsError && <p role="alert">{brandsError}</p>}
      <div className="brand-grid">{brands.map(brand => <article id={'brand-'+brand.slug} className={activeBrand === brand.slug ? 'brand-tile selected' : 'brand-tile'} key={brand.slug}>
        <div><h2>{brand.name}</h2><button className="follow-button" aria-pressed={following.includes(brand.slug)} onClick={() => toggleFollow(brand.slug)}>{following.includes(brand.slug) ? 'Following' : 'Follow'}</button></div>
        <p>{brand.product_count != null ? brand.product_count.toLocaleString('en-IN') + ' collected products' : 'Explore this label'}</p>
        <button className="text-link" onClick={() => browseBrand(brand.slug)}>Explore catalogue <Arrow/></button>
      </article>)}</div>
      <div className="radar-future"><span className="radar-dot"/><div><h2>Weekly activity</h2><p>Weekly drop and price history is not available yet.</p></div></div>
    </main>}
    {compare.length > 0 && <details className="comparison" aria-label="Product comparison">
      <summary>Compare selected items <span>{compare.length}/3</span></summary>
      <div className="comparison-heading"><h2>Compare your picks</h2><button onClick={() => setCompare([])}>Clear all</button></div>
      <div className="comparison-items">{compare.map(product => <article key={product.id}>
        <button className="remove-item" onClick={() => toggleCompare(product)} aria-label={'Remove '+product.title}>×</button>
        <span>{product.brand}</span><h3>{product.title}</h3><b>{money(product.selected_variant.price_minor)}</b>
        <p>{product.selected_variant.size || 'Size unknown'} · {product.selected_variant.colour || 'Colour unknown'}</p>
        <small>Delivery / returns: check brand</small>
        {product.source_url && <a href={product.source_url} target="_blank" rel="noopener noreferrer">View at brand <Arrow/></a>}
      </article>)}</div>
    </details>}
    <footer id="about"><a className="wordmark" href="/">THE CLOTHING <b>STAR</b></a><p>Find the fit. Shop with the brand.</p>
      <small>{mode.includes('preview') ? 'Local catalogue preview · recorded observations' : mode === 'demo' ? 'Fictional demonstration' : 'Independent streetwear discovery'}</small>
    </footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);

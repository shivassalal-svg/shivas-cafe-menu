import { getMenu } from "./lib/menu";

export const dynamic = "force-dynamic";

export default async function Home() {
  const menu = await getMenu();
  return (
    <main className="menu-shell">
      <header className="menu-topbar">
        <a className="menu-brand" href="/" aria-label="Shiva’s Cafe menu home">
          <span className="menu-mark">S</span>
          <span>Shiva’s Cafe<small>Salal · Gujarat</small></span>
        </a>
        <span className="view-only-badge"><span /> Menu only</span>
      </header>

      <section className="menu-hero">
        <p className="eyebrow">A little something for every appetite</p>
        <h1>Good food,<br />easy to browse.</h1>
        <p className="hero-copy">Explore the Shiva’s Cafe menu, with fresh favorites and something for every mood.</p>
        <div className="hero-note">Browse only&nbsp; · &nbsp;No ordering or payment</div>
      </section>

      <nav className="category-nav" aria-label="Menu categories">
        {menu.map((category) => (
          <a key={category.id} href={`#${category.id}`}>{category.name}</a>
        ))}
      </nav>

      <div className="menu-catalog">
        {menu.map((category) => (
          <section className="menu-category" key={category.id} id={category.id}>
            <div className="category-heading">
              <div><p className="eyebrow">Shiva’s Cafe</p><h2>{category.name}</h2></div>
              <span>{category.items.length} options</span>
            </div>
            <div className="product-grid">
              {category.items.map((item) => (
                <article
                  className={`product-card ${item.outOfStock ? "out-of-stock-card" : ""}`}
                  key={item.id}
                >
                  <div className="product-image-wrap">
                    {item.image ? (
                      <img className="product-image" src={item.image} alt={item.name} loading="lazy" />
                    ) : <div className="image-placeholder" aria-label="No image available">S</div>}
                    {item.outOfStock && (
                      <span className="stock-badge out-badge">Out of stock</span>
                    )}
                  </div>
                  <div className="product-copy">
                    <div className="product-name">{item.name}</div>
                    {item.description && <div className="product-description">{item.description}</div>}
                    <div className="product-price-row">
                      <div className="product-price">{item.price}</div>
                      {item.outOfStock && (
                        <span className="stock-status-tag">Currently unavailable</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="menu-footer">
        <span className="menu-mark small-mark">S</span>
        <div><strong>Shiva’s Cafe</strong><p>Salal, Gujarat · Menu for browsing only</p></div>
      </footer>
    </main>
  );
}

import { IconSearch, IconClose } from "./Icons.jsx";

export default function ShopToolbar({ categories, category, onCategory, sort, onSort, search, onSearch, count, searchRef }) {
  return (
    <div className="toolbar">
      <div className="chips" role="group" aria-label="Filter by category">
        {categories.map((c) => (
          <button key={c} className={"chip" + (c === category ? " is-active" : "")} aria-pressed={c === category} onClick={() => onCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <label className="search-field">
          <IconSearch size={18} />
          <span className="sr-only">Search products</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search coats, knits, colours…"
            value={search}
            maxLength={60}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="search-clear" onClick={() => onSearch("")} aria-label="Clear search">
              <IconClose size={16} />
            </button>
          )}
        </label>

        <span className="result-count" aria-live="polite">
          {count} {count === 1 ? "piece" : "pieces"}
        </span>

        <label className="sort-field">
          <span>Sort</span>
          <select value={sort} onChange={(e) => onSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="new">New in</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>
    </div>
  );
}

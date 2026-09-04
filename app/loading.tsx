/** Skelett i sidans egen form medan servern hämtar riket — i stället för en tom yta. */
export default function Loading() {
  return (
    <main className='page-stack skeleton' aria-busy='true' aria-label='Laddar'>
      <section>
        <div className='skeleton-line skeleton-title' />
        <div className='skeleton-line skeleton-sub' />
        <p className='skeleton-text' />
      </section>
      <section className='grid cols-4'>
        {[0, 1, 2, 3].map((i) => <div key={i} className='card skeleton-card' />)}
      </section>
      <section className='card skeleton-block' />
    </main>
  );
}

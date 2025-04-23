import '../styles/globals.css';
import Script from 'next/script'; // Import Script component

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {/* Load Bootstrap JS bundle - Strategy 'lazyOnload' loads it after the page interactive */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        strategy="lazyOnload"
      />
    </>
  );
}

export default MyApp; 
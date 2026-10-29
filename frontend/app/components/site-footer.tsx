import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="about">
      <div>
        <Link className="brand" href="/">bazaar<span>.</span></Link>
        <p>A little more joy in the everyday.</p>
      </div>
      <p className="footer-note">Thoughtful finds. A slower kind of shopping.</p>
      <span className="copyright">© {new Date().getFullYear()} Bazaar</span>
    </footer>
  );
}

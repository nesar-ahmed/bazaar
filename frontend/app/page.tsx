import Link from "next/link";

import { ButtonLink } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";

export const metadata = {
  title: "A considered market for everyday living",
  description:
    "Welcome to Bazaar, a thoughtful online market for the things that make everyday living feel more your own.",
};

const notes = [
  {
    number: "01",
    title: "Take your time",
    description: "A calm place to explore, discover, and find something that feels right.",
  },
  {
    number: "02",
    title: "Find your way",
    description: "Browse the collection or use search and categories to make it yours.",
  },
  {
    number: "03",
    title: "Make it personal",
    description: "Create an account to keep your bag and orders together in one place.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero landing-hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <div>
            <p className="hero__eyebrow label label--signal">A THOUGHTFUL PLACE TO BEGIN</p>
            <h1 id="hero-title">
              Everyday, made a little more <em>beautiful.</em>
            </h1>
            <p className="hero__lede">
              Welcome to Bazaar. Explore at your own pace and find the things
              that make a place, a routine, or a moment feel like yours.
            </p>
            <div className="hero__actions">
              <ButtonLink href="/discover" variant="cta" size="lg">
                Explore Bazaar
                <Icon.ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href="#our-approach" variant="outline" size="lg">
                Get to know us
              </ButtonLink>
            </div>
          </div>
          <p className="landing-note">A considered market for the everyday.</p>
        </div>

        <div className="hero__stage landing-stage" aria-hidden="true">
          <div className="landing-stage__orbit landing-stage__orbit--outer" />
          <div className="landing-stage__orbit landing-stage__orbit--inner" />
          <div className="landing-stage__center">
            <span className="landing-stage__wordmark">bazaar<span>.</span></span>
            <span className="landing-stage__rule" />
            <p>Find your own<br />kind of lovely.</p>
          </div>
          <span className="landing-stage__caption">A MARKET FOR EVERYDAY LIVING</span>
          <span className="landing-stage__index">EST. WITH CARE</span>
        </div>
      </section>

      <section
        className="container section landing-intro"
        id="our-approach"
        aria-labelledby="intro-title"
      >
        <div className="showcase__head">
          <div>
            <p className="label">The Bazaar feeling</p>
            <h2 id="intro-title">A little room to discover.</h2>
            <p>
              Thoughtful browsing, an easy path around, and space to find what
              feels right for you.
            </p>
          </div>
          <Link className="link-arrow" href="/discover">
            Discover the collection
            <Icon.ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="promise">
          {notes.map((note) => (
            <article className="promise__item" key={note.number}>
              <p className="label">{note.number}</p>
              <h3>{note.title}</h3>
              <p>{note.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="join">
          <div>
            <p className="label" style={{ color: "var(--signal)" }}>Make yourself at home</p>
            <h2>A good place to come back to.</h2>
            <p>
              Start exploring, or create an account to keep your Bazaar experience
              close at hand.
            </p>
          </div>
          <div className="join__actions">
            <ButtonLink href="/discover" variant="signal" size="lg">
              Start exploring
            </ButtonLink>
            <ButtonLink href="/register" variant="ghost-light" size="lg">
              Create an account
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

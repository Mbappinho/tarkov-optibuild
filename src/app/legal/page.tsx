import type { Metadata } from "next";
import Link from "next/link";
import { GITHUB_ISSUES_URL, GITHUB_REPO, KOFI_URL, TARKOV_DEV } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales — Tarkov Optibuild",
  description:
    "Avertissement, source des données, vie privée et mentions légales de Tarkov Optibuild.",
};

export default function LegalPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <p>
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase hover:text-signal"
        >
          ← Optibuild
        </Link>
      </p>
      <header className="flex flex-col gap-2">
        <p className="hud-label">Juridique</p>
        <h1 className="text-3xl font-bold tracking-wide text-fog uppercase">
          Mentions légales
        </h1>
      </header>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">Avertissement</h2>
        <p className="text-sm leading-6 text-fog">
          Tarkov Optibuild est un outil communautaire indépendant. Il n’est
          pas affilié, approuvé ni sponsorisé par Battlestate Games Limited.
          Escape from Tarkov et les éléments associés sont des marques et des
          contenus protégés appartenant à leurs titulaires.
        </p>
        <p className="text-sm leading-6 text-muted">
          L’outil ne se connecte pas au client de jeu, n’injecte rien, ne
          contourne aucun anti-cheat et n’accède pas aux serveurs officiels
          Battlestate. Les builds proposés sont des calculs à partir de
          données communautaires : ils peuvent être incomplets ou faux après
          un patch.
        </p>
      </section>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">Données</h2>
        <p className="text-sm leading-6 text-fog">
          Les items, stats, prix traders/flea et icônes viennent de{" "}
          <a
            href={TARKOV_DEV}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            tarkov.dev
          </a>{" "}
          via le dump JSON public{" "}
          <a
            href="https://json.tarkov.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            json.tarkov.dev
          </a>
          . Ce n’est pas l’API officielle du jeu. Le catalogue est mis en
          cache environ une heure. Les pictos sont affichés depuis les URLs
          fournies par tarkov.dev, sans copie locale.
        </p>
      </section>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">Vie privée</h2>
        <p className="text-sm leading-6 text-fog">
          Pas de compte, pas de cookies de tracking, pas d’analytics tiers
          dans l’app. Les réglages restent dans l’URL de partage sur ton
          navigateur.
        </p>
        <p className="text-sm leading-6 text-muted">
          L’hébergeur peut journaliser l’IP, l’heure et l’URL des requêtes
          (sécurité, quota). Un bug ou une suggestion ouvre GitHub : le
          traitement est alors celui de GitHub. Un don passe par Ko-fi. Ces
          services ont leurs propres politiques.
        </p>
      </section>

      <section className="chamfer hud-panel flex flex-col gap-3 p-4">
        <h2 className="hud-label">Éditeur / hébergeur</h2>
        <p className="text-sm leading-6 text-fog">
          Site non professionnel, édité par le compte GitHub{" "}
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            {GITHUB_REPO}
          </a>
          . Contact :{" "}
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            issues GitHub
          </a>
          .
        </p>
        <p className="text-sm leading-6 text-muted">
          Hébergeur : à renseigner selon le déploiement (nom, adresse, pays).
          Tant que ce bloc n’est pas complété, le site ne devrait pas être
          présenté comme un service professionnel en France.
        </p>
        <p className="text-sm leading-6 text-muted">
          Les dons via{" "}
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline-offset-2 hover:underline"
          >
            Ko-fi
          </a>{" "}
          sont facultatifs et n’achètent aucun avantage in-game. Leur
          déclaration fiscale, le cas échéant, est à la charge de l’éditeur.
        </p>
      </section>
    </div>
  );
}

import { render, screen } from "@testing-library/react";
import NotesPage from "../app/notes/page";
import { useUser } from "../lib/UserContext";

jest.mock("../lib/UserContext", () => ({
  useUser: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("NotesPage", () => {
  it("prompts signed-out users to sign in", () => {
    (useUser as jest.Mock).mockReturnValue({ user: null, loading: false });

    render(<NotesPage />);

    expect(screen.getByText("Sign in to access Notes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to homepage" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

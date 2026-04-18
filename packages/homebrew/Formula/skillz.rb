class Skillz < Formula
  desc "Launchpad CLI — one command to run or install any Claude Code skill"
  homepage "https://launchpad.dev"
  version "0.1.0-dev.0"
  license "MIT"

  # Sha values and the version are bumped by the release workflow; see
  # .github/workflows/cli-release.yml's tap-bump step. Until the first
  # public release these fields are placeholders — `brew install` will
  # reject them intentionally.
  PLACEHOLDER = "0000000000000000000000000000000000000000000000000000000000000000"

  on_macos do
    on_arm do
      url "https://github.com/launchpad-skills/launchpad/releases/download/skillz-v#{version}/skillz-darwin-arm64"
      sha256 PLACEHOLDER
    end
    on_intel do
      url "https://github.com/launchpad-skills/launchpad/releases/download/skillz-v#{version}/skillz-darwin-x64"
      sha256 PLACEHOLDER
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/launchpad-skills/launchpad/releases/download/skillz-v#{version}/skillz-linux-arm64"
      sha256 PLACEHOLDER
    end
    on_intel do
      url "https://github.com/launchpad-skills/launchpad/releases/download/skillz-v#{version}/skillz-linux-x64"
      sha256 PLACEHOLDER
    end
  end

  def install
    # The downloaded asset IS the binary (bun build --compile output).
    # Rename and install.
    bin_path = case [OS.mac?, OS.linux?, Hardware::CPU.arm?, Hardware::CPU.intel?]
    when [true, false, true, false] then "skillz-darwin-arm64"
    when [true, false, false, true] then "skillz-darwin-x64"
    when [false, true, true, false] then "skillz-linux-arm64"
    when [false, true, false, true] then "skillz-linux-x64"
    else
      odie "unsupported platform — file an issue at https://github.com/launchpad-skills/launchpad"
    end

    bin.install bin_path => "skillz"
    bin.install_symlink bin/"skillz" => "launchpad"
  end

  def caveats
    <<~EOS
      launchpad is now on your PATH as both `skillz` and `launchpad`.

      Verify the binary's signature (recommended):
        skillz verify

      This requires cosign. Install it first with:
        brew install cosign

      Without cosign, `skillz verify` still checks the SHA-256 against
      the release's signed SHASUMS256.txt — just not the signature bundle.

      First run:
        skillz doctor       # environment preflight
        skillz search <term>
        skillz run <name>   # fetch + execute one-shot
    EOS
  end

  test do
    assert_match "skillz #{version}", shell_output("#{bin}/skillz --version")
    assert_match "launchpad", shell_output("#{bin}/skillz --help")
    # doctor should exit 0 on a clean CI runner.
    system bin/"skillz", "doctor"
  end
end

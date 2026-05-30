{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    npm.enable = true;
  };

  packages = [
    pkgs.git
  ];

  enterShell = ''
    echo "labelgen dev shell — Node $(node --version)"
  '';
}

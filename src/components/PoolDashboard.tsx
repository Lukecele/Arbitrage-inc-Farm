import React, { useState } from "react";
import { PoolInfo, SUPPORTED_TOKENS, DEV_FEE_ADDRESS } from "../lib/constants";
import ZapWidget from "./ZapWidget/ZapWidget";
import {
  Search,
  ChevronRight,
  Activity,
  Wallet,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { useConnectWallet } from "@web3-onboard/react";
import { usePortfolio } from "../hooks/usePortfolio";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useTokenPrices } from "../hooks/useTokenPrices";
import { usePoolData } from "../hooks/usePoolData";

function TreasuryTokenRow({
  symbol,
  address,
}: {
  symbol: string;
  address: string;
}) {
  const { balance } = useTokenBalance(address, DEV_FEE_ADDRESS);
  const tokenConfig = SUPPORTED_TOKENS.find((t) => t.symbol === symbol);

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={tokenConfig?.logoUrl}
            className="w-8 h-8 rounded-full"
            alt={symbol}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <p className="font-bold text-white group-hover:text-amber-500 transition-colors">
              {symbol}
            </p>
            <p className="text-[10px] text-slate-500">Token</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <p className="text-sm font-bold text-white">
          {balance} {symbol}
        </p>
      </td>
      <td className="px-6 py-4 text-right">
        <p className="text-sm font-bold text-white font-mono">—</p>
      </td>
    </tr>
  );
}

export default function PoolDashboard() {
  const [{ wallet }] = useConnectWallet();
  const address = wallet?.accounts[0].address;
  const { positions, addPosition } = usePortfolio(address);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"VAULTS" | "PORTFOLIO" | "TREASURY">(
    "VAULTS",
  );

  // Live prices from CoinGecko
  const { prices, getPrice, loading: pricesLoading } = useTokenPrices();

  // Live pool data (APY/TVL from KyberSwap, prices computed from CoinGecko)
  const { pools, lastUpdated, refresh: refreshPools } = usePoolData(prices);

  const filteredPools = pools
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.platform.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => b.apy - a.apy);

  if (selectedPool) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[480px]">
          <ZapWidget
            initialPool={selectedPool}
            initialTab={selectedPosition ? "OUT" : "IN"}
            initialNftId={selectedPosition?.nftId}
            onClose={() => {
              setSelectedPool(null);
              setSelectedPosition(null);
            }}
            onSuccess={(amountUSD, nftId) =>
              addPosition(
                selectedPool,
                amountUSD,
                nftId || selectedPosition?.nftId,
              )
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Nav */}
      <div className="flex items-center gap-4 border-b border-[#1E293B] pb-4 mb-6">
        <button
          onClick={() => setView("VAULTS")}
          className={`font-semibold text-lg flex items-center gap-2 px-2 py-1 transition-colors ${view === "VAULTS" ? "text-white border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"}`}
        >
          <Activity size={20} /> Opportunità
        </button>
        <button
          onClick={() => setView("PORTFOLIO")}
          className={`font-semibold text-lg flex items-center gap-2 px-2 py-1 transition-colors ${view === "PORTFOLIO" ? "text-white border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"}`}
        >
          <PieChart size={20} /> Mio Portfolio
        </button>
        <button
          onClick={() => setView("TREASURY")}
          className={`font-semibold text-lg flex items-center gap-2 px-2 py-1 transition-colors ${view === "TREASURY" ? "text-white border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"}`}
        >
          <Activity size={20} className="text-amber-500" /> Tesoro
        </button>
      </div>

      {view === "VAULTS" && (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                Pool di Liquidità
              </h1>
              <p className="text-slate-400">
                Scopri e investi nelle pool più performanti su BSC con
                tecnologia Arbitrage Inception.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Live update indicator */}
              <button
                onClick={refreshPools}
                title="Aggiorna dati"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                <RefreshCw
                  size={13}
                  className={pricesLoading ? "animate-spin text-amber-500" : ""}
                />
                {lastUpdated
                  ? `Live • ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Caricamento..."}
              </button>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Cerca per token o piattaforma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-[300px] bg-[#0A0D14] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPools.map((pool) => (
              <div
                key={pool.id}
                className={`bg-[#131A2A] border ${
                  pool.risk === "Extreme"
                    ? "border-red-500/30 hover:border-red-500"
                    : pool.risk === "High"
                      ? "border-orange-500/30 hover:border-orange-500"
                      : "border-[#1E293B] hover:border-slate-500"
                } rounded-2xl p-5 transition-colors ${pool.isInRange === false ? "opacity-80 cursor-not-allowed" : "cursor-pointer"} group shadow-lg relative overflow-hidden`}
                onClick={() => {
                  if (pool.isInRange === false) return; // prevent zapping out-of-range pools
                  setSelectedPool(pool);
                }}
              >
                {pool.risk === "Extreme" && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    RISCHIO ESTREMO
                  </div>
                )}
                {pool.risk === "High" && (
                  <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    RISCHIO ALTO
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 mt-2">
                  <div className="flex -space-x-2">
                    <img
                      src={
                        pool.token0Logo ||
                        "https://placehold.co/40x40/1e293b/94a3b8?text=?"
                      }
                      alt={pool.token0}
                      className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#131A2A] shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                    <img
                      src={
                        pool.token1Logo ||
                        "https://placehold.co/40x40/1e293b/94a3b8?text=?"
                      }
                      alt={pool.token1}
                      className="w-10 h-10 rounded-full bg-slate-700 border-2 border-[#131A2A] shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
                      {pool.platform}
                    </span>
                    {pool.dex === "DEX_PANCAKESWAPV2" && (
                      <span className="text-[9px] font-bold tracking-wider uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20 mt-1">
                        AMM V2
                      </span>
                    )}
                    {pool.isInRange === false && (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/30">
                        FUORI RANGE
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">
                  {pool.name}
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Commissioni {pool.fee}
                </p>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">APY</p>
                    <p
                      className={`text-2xl font-bold ${pool.apy > 100 ? "text-green-400" : "text-slate-200"}`}
                    >
                      {pool.apy >= 1_000_000
                        ? (pool.apy / 1_000_000).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          }) + "M"
                        : pool.apy >= 1000
                          ? pool.apy.toLocaleString(undefined, {
                              maximumFractionDigits: 1,
                            })
                          : pool.apy.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                      %
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">TVL</p>
                    <p className="text-sm font-medium text-white">
                      $
                      {pool.tvl >= 1_000_000
                        ? (pool.tvl / 1_000_000).toFixed(2) + "M"
                        : pool.tvl >= 1000
                          ? (pool.tvl / 1000).toFixed(1) + "K"
                          : pool.tvl.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Live price badge */}
                {pool.currentPrice && pool.currentPrice > 0 && (
                  <div className="mt-3 text-[10px] text-slate-500 font-mono">
                    Prezzo:{" "}
                    {pool.currentPrice < 0.0001
                      ? pool.currentPrice.toExponential(3)
                      : pool.currentPrice.toLocaleString(undefined, {
                          maximumSignificantDigits: 5,
                        })}{" "}
                    {pool.token1}/{pool.token0}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[#1E293B] flex justify-between items-center text-sm font-medium text-amber-500 group-hover:text-amber-400">
                  Zap &amp; Guadagna
                  <ChevronRight
                    size={16}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "PORTFOLIO" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#131A2A] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-sm text-slate-400 mb-2">Deposito Totale</h3>
              <p className="text-3xl font-bold text-white">
                $
                {positions
                  .reduce((acc, p) => acc + p.amountUSD, 0)
                  .toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
            </div>
            <div className="bg-[#131A2A] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-sm text-slate-400 mb-2">
                Rendimento Giornaliero
              </h3>
              <p className="text-3xl font-bold text-green-400">
                +$
                {positions
                  .reduce(
                    (acc, p) =>
                      acc +
                      p.amountUSD *
                        ((1 + (p.pool?.apy ?? 0) / 100) ** (1 / 365) - 1),
                    0,
                  )
                  .toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
            </div>
            <div className="bg-[#131A2A] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-sm text-slate-400 mb-2">Posizioni Attive</h3>
              <p className="text-3xl font-bold text-white">
                {positions.length}
              </p>
            </div>
          </div>

          {!wallet || positions.length === 0 ? (
            <div className="bg-[#0A0D14] border border-[#1E293B] rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <Wallet size={48} className="text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {!wallet ? "Connetti Wallet" : "Nessuna Posizione"}
              </h3>
              <p className="text-slate-400 mb-6">
                {!wallet
                  ? "Connetti il tuo wallet per vedere le tue posizioni di liquidità."
                  : "Non hai ancora effettuato uno Zap in nessuna pool."}
              </p>
              {wallet && (
                <button
                  onClick={() => setView("VAULTS")}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Sfoglia Pool
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">I Tuoi Caveau</h3>
              {positions.map((p) => {
                // Prefer the live pool data over the stale snapshot in localStorage
                const livePool =
                  pools.find((pl) => pl.id === p.poolId) ?? p.pool;
                const minPrice = p.minPrice ?? livePool?.minPrice ?? 0;
                const maxPrice = p.maxPrice ?? livePool?.maxPrice ?? Infinity;
                const currentPrice = livePool?.currentPrice ?? 0;
                const inRange =
                  maxPrice !== Infinity && minPrice > 0
                    ? currentPrice >= minPrice && currentPrice <= maxPrice
                    : true;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPool(livePool);
                      setSelectedPosition(p);
                    }}
                    className="bg-[#131A2A] border border-[#1E293B] hover:border-amber-500/50 cursor-pointer transition-all rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <img
                          src={
                            livePool?.token0Logo ||
                            "https://placehold.co/40x40/1e293b/94a3b8?text=?"
                          }
                          alt={livePool?.token0}
                          className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#131A2A] shadow-sm"
                        />
                        <img
                          src={
                            livePool?.token1Logo ||
                            "https://placehold.co/40x40/1e293b/94a3b8?text=?"
                          }
                          alt={livePool?.token1}
                          className="w-10 h-10 rounded-full bg-slate-700 border-2 border-[#131A2A] shadow-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors">
                            {livePool?.name}
                          </h4>
                          {p.nftId && (
                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded-md border border-slate-700/60">
                              NFT #{p.nftId}
                            </span>
                          )}
                          {!inRange && (
                            <span className="text-[9px] font-bold tracking-wider uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/30">
                              FUORI RANGE
                            </span>
                          )}
                          {inRange && (
                            <span className="text-[9px] font-bold tracking-wider uppercase text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md border border-green-500/30">
                              IN RANGE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {livePool?.platform} • Comm. {livePool?.fee} • Prezzo:{" "}
                          {currentPrice
                            ? currentPrice.toLocaleString(undefined, {
                                maximumFractionDigits: currentPrice < 1 ? 6 : 2,
                              })
                            : "—"}
                        </p>

                        {minPrice > 0 &&
                          maxPrice !== Infinity &&
                          currentPrice > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
                                <div className="absolute inset-0 bg-amber-500/5" />
                                <div
                                  className={`absolute h-full transition-all duration-700 ${inRange ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-red-500"}`}
                                  style={{
                                    left: `${Math.max(0, Math.min(100, ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100))}%`,
                                    width: "4px",
                                    marginLeft: "-2px",
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                                <span className="text-slate-400">
                                  {minPrice.toLocaleString()}
                                </span>
                                <ChevronRight size={8} />
                                <span className="text-slate-400">
                                  {maxPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-slate-500 mb-1">
                          Depositato
                        </p>
                        <p className="text-lg font-bold text-white">
                          $
                          {p.amountUSD.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Gestisci</p>
                        <div className="text-amber-500 flex items-center gap-1 font-semibold text-sm">
                          Preleva / Zap Out <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "TREASURY" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                Protocol Treasury
              </h1>
              <p className="text-slate-400">
                Monitoraggio in tempo reale dei guadagni e delle riserve del
                protocollo Arbitrage Inception.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-amber-500 font-bold tracking-widest uppercase">
                Live Monitoring
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#131A2A] border border-[#1E293B] rounded-2xl p-6">
              <h3 className="text-sm text-slate-400 mb-2 font-medium">
                Tesoro Monitorato
              </h3>
              <p className="text-lg font-mono text-white break-all">
                {DEV_FEE_ADDRESS}
              </p>
              <p className="text-[10px] text-slate-500 mt-2">
                Indirizzo ufficiale del protocollo
              </p>
            </div>
            <div className="bg-[#131A2A] border border-[#1E293B] rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm text-slate-400 mb-2 font-medium">
                  Status
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-white">
                    Live Monitoring
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#131A2A] border border-[#1E293B] rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#1E293B] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Composizione Asset Tesoro
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Aggiornato ogni 15s
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E293B]/50 bg-[#0D111C]/30">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Token
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                      Bilancio
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                      Valore (USD)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/30">
                  <TreasuryTokenRow
                    symbol="BNB"
                    address="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                  />
                  <TreasuryTokenRow
                    symbol="USDT"
                    address="0x55d398326f99059fF775485246999027B3197955"
                  />
                  <TreasuryTokenRow
                    symbol="CAKE"
                    address="0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
                  />
                  <TreasuryTokenRow
                    symbol="USDC"
                    address="0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
                  />
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-center">
            <h4 className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-3">
              Treasury Management Policy
            </h4>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
              Le fee generate dalla tecnologia Arbitrage Inception vengono
              accumulate nel Treasury Wallet. Queste risorse sono dedicate alla
              stabilità del protocollo, al riacquisto di token e ai premi per i
              fornitori di liquidità più fedeli.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

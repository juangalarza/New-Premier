'use client';

import * as React from 'react';
import {
  Box, Typography, IconButton, Tooltip, Button,
  ToggleButtonGroup, ToggleButton, Avatar,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  ChevronLeftOutlined, ChevronRightOutlined, DirectionsCarOutlined,
} from '@mui/icons-material';
import ReservaDrawer from './ReservaDrawer';
import type { Vehiculo, Sucursal, Categoria } from '@/types';
import type { ReservaConRelaciones } from '@/app/dashboard/reservas/actions';
import { getGanttData } from '@/app/dashboard/calendario/actions';

// ─── Constantes ───────────────────────────────────────────────────────────────
const COL_VEHICLE = 200;
const DAY_W = 40;
const ROW_H = 52;
const HEADER_H = 76;

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['D','L','M','X','J','V','S'];

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  confirmada: { bg: '#2dd4a0', text: '#fff' },
  en_curso:   { bg: '#4f46e5', text: '#fff' },
  pendiente:  { bg: '#f5a623', text: '#fff' },
  preventa:   { bg: '#94a3b8', text: '#fff' },
  devuelta:   { bg: '#cbd5e1', text: '#475569' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function diasEnMes(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function diaSemana(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}
function isWeekend(year: number, month: number, day: number) {
  const d = diaSemana(year, month, day);
  return d === 0 || d === 6;
}

type GanttRow =
  | { kind: 'vehiculo'; vehiculo: Vehiculo }
  | { kind: 'divider'; nombre: string };

interface Props {
  vehiculosIniciales: Vehiculo[];
  reservasIniciales: ReservaConRelaciones[];
  añoInicial: number;
  mesInicial: number;
  sucursalesIniciales: Sucursal[];
  categoriasIniciales: Categoria[];
}

export default function GanttCalendar({
  vehiculosIniciales,
  reservasIniciales,
  añoInicial,
  mesInicial,
  sucursalesIniciales,
  categoriasIniciales,
}: Props) {
  const [año, setAño] = React.useState(añoInicial);
  const [mes, setMes] = React.useState(mesInicial);
  const [numMeses, setNumMeses] = React.useState<number>(1);
  const [vehiculos, setVehiculos] = React.useState(vehiculosIniciales);
  const [reservas, setReservas] = React.useState(reservasIniciales);
  const [loading, setLoading] = React.useState(false);
  const [selectedReserva, setSelectedReserva] = React.useState<ReservaConRelaciones | null>(null);
  const [sucursalId, setSucursalId] = React.useState<string | null>(null);
  const [categoriaId, setCategoriaId] = React.useState<string | null>(null);

  const cargarDatos = React.useCallback(async (
    y: number,
    m: number,
    nm: number,
    sId?: string | null,
    cId?: string | null,
  ) => {
    setLoading(true);
    const data = await getGanttData(y, m, nm, sId, cId);
    setVehiculos(data.vehiculos);
    setReservas(data.reservas);
    setLoading(false);
  }, []);

  const navMes = (delta: number) => {
    let nm = mes + delta;
    let ny = año;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setMes(nm); setAño(ny);
    cargarDatos(ny, nm, numMeses, sucursalId, categoriaId);
  };

  const handleNumMeses = (_: unknown, val: number | null) => {
    if (!val) return;
    setNumMeses(val);
    cargarDatos(año, mes, val, sucursalId, categoriaId);
  };

  const handleSucursal = (newId: string | null) => {
    setSucursalId(newId);
    cargarDatos(año, mes, numMeses, newId, categoriaId);
  };

  const handleCategoria = (newId: string | null) => {
    setCategoriaId(newId);
    cargarDatos(año, mes, numMeses, sucursalId, newId);
  };

  // Generar días de todos los meses visibles
  const mesesVisibles: { year: number; month: number; days: number[] }[] = [];
  for (let i = 0; i < numMeses; i++) {
    let m = mes + i; let y = año;
    if (m > 12) { m -= 12; y++; }
    const d = diasEnMes(y, m);
    mesesVisibles.push({ year: y, month: m, days: Array.from({ length: d }, (_, j) => j + 1) });
  }
  const totalDias = mesesVisibles.reduce((s, mv) => s + mv.days.length, 0);
  const totalWidth = COL_VEHICLE + totalDias * DAY_W;

  // Mapear reservas por vehículo
  const reservasPorVehiculo = React.useMemo(() => {
    const map: Record<string, ReservaConRelaciones[]> = {};
    for (const r of reservas) {
      if (!r.vehiculo_id) continue;
      if (!map[r.vehiculo_id]) map[r.vehiculo_id] = [];
      map[r.vehiculo_id].push(r);
    }
    return map;
  }, [reservas]);

  // Cuando se muestran todas las sucursales, agrupa los vehículos con filas divisoras
  const ganttRows = React.useMemo((): GanttRow[] => {
    if (sucursalId !== null) {
      return vehiculos.map(v => ({ kind: 'vehiculo', vehiculo: v }));
    }
    const groups = new Map<string, { nombre: string; items: Vehiculo[] }>();
    for (const v of vehiculos) {
      const key = v.sucursal_id ?? '__sin__';
      if (!groups.has(key)) {
        groups.set(key, { nombre: v.sucursal?.nombre ?? 'Sin sucursal', items: [] });
      }
      groups.get(key)!.items.push(v);
    }
    const rows: GanttRow[] = [];
    for (const [, g] of groups) {
      rows.push({ kind: 'divider', nombre: g.nombre });
      for (const veh of g.items) rows.push({ kind: 'vehiculo', vehiculo: veh });
    }
    return rows;
  }, [vehiculos, sucursalId]);

  function calcBloque(r: ReservaConRelaciones, visMonthIndex: number) {
    const { year: vy, month: vm, days } = mesesVisibles[visMonthIndex];
    const monthStart = new Date(vy, vm - 1, 1);
    const monthEnd = new Date(vy, vm - 1, days.length, 23, 59, 59);
    const resStart = new Date(r.fecha_entrega);
    const resEnd = new Date(r.fecha_devolucion);

    if (resStart > monthEnd || resEnd < monthStart) return null;

    const clippedStart = resStart < monthStart ? monthStart : resStart;
    const clippedEnd = resEnd > monthEnd ? monthEnd : resEnd;

    const startDay = clippedStart.getDate();
    const endDay = clippedEnd.getDate();

    let dayOffset = 0;
    for (let i = 0; i < visMonthIndex; i++) dayOffset += mesesVisibles[i].days.length;

    const leftPct = ((dayOffset + startDay - 1) / totalDias) * 100;
    const widthPct = ((endDay - startDay + 1) / totalDias) * 100;

    return { leftPct, widthPct };
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 0, p: 0.5 }}>
      {/* Gantt principal */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {/* Navegación de mes */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={() => navMes(-1)} disabled={loading} sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', p: 0.75, '&:hover': { bgcolor: '#f1f5f9' } }}>
              <ChevronLeftOutlined sx={{ fontSize: 18 }} />
            </IconButton>
            <Typography sx={{ fontWeight: 700, fontFamily: '"Outfit", "Inter", sans-serif', minWidth: 160, textAlign: 'center', color: '#1e293b', fontSize: '0.95rem' }}>
              {MESES[mes - 1]} {año}
            </Typography>
            <IconButton size="small" onClick={() => navMes(1)} disabled={loading} sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', p: 0.75, '&:hover': { bgcolor: '#f1f5f9' } }}>
              <ChevronRightOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Toggle 1/2 meses */}
          <ToggleButtonGroup
            size="small"
            value={numMeses}
            exclusive
            onChange={handleNumMeses}
            sx={{
              bgcolor: '#ffffff',
              boxShadow: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              p: 0.25,
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                '&.Mui-disabled': { border: 0 },
                '&:not(:first-of-type)': { borderRadius: '6px' },
                '&:first-of-type': { borderRadius: '6px' },
              },
            }}
          >
            <ToggleButton value={1} sx={{ fontWeight: 600, fontSize: '0.8rem', px: 2, py: 0.5, color: '#64748b', textTransform: 'none', '&.Mui-selected': { bgcolor: '#4f46e5', color: '#ffffff', '&:hover': { bgcolor: '#4338ca' } } }}>
              1 mes
            </ToggleButton>
            <ToggleButton value={2} sx={{ fontWeight: 600, fontSize: '0.8rem', px: 2, py: 0.5, color: '#64748b', textTransform: 'none', '&.Mui-selected': { bgcolor: '#4f46e5', color: '#ffffff', '&:hover': { bgcolor: '#4338ca' } } }}>
              2 meses
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Botón Hoy */}
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const now = new Date();
              setAño(now.getFullYear()); setMes(now.getMonth() + 1);
              cargarDatos(now.getFullYear(), now.getMonth() + 1, numMeses, sucursalId, categoriaId);
            }}
            sx={{ fontWeight: 600, color: '#4f46e5', borderColor: '#e2e8f0', bgcolor: '#ffffff', px: 2.5, py: 0.65, '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' } }}
          >
            Hoy
          </Button>

          {/* Filtro sucursal */}
          <FormControl size="small" sx={{ minWidth: 155, bgcolor: '#ffffff', borderRadius: 1 }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>Sucursal</InputLabel>
            <Select
              value={sucursalId ?? ''}
              label="Sucursal"
              onChange={(e) => handleSucursal((e.target.value as string) || null)}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value=""><em>Todas</em></MenuItem>
              {sucursalesIniciales.map(s => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.85rem' }}>{s.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Filtro categoría */}
          <FormControl size="small" sx={{ minWidth: 155, bgcolor: '#ffffff', borderRadius: 1 }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>Categoría</InputLabel>
            <Select
              value={categoriaId ?? ''}
              label="Categoría"
              onChange={(e) => handleCategoria((e.target.value as string) || null)}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value=""><em>Todas</em></MenuItem>
              {categoriasIniciales.map(c => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.85rem' }}>{c.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {loading && <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>Actualizando...</Typography>}

          {/* Leyenda */}
          <Box sx={{ display: 'flex', gap: 2, ml: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            {[['confirmada','Confirmada'],['en_curso','En curso'],['pendiente','Pendiente'],['preventa','Preventa']].map(([estado, label]) => (
              <Box key={estado} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ESTADO_COLOR[estado]?.bg }} />
                <Typography variant="caption" sx={{ fontWeight: 500, color: '#64748b' }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Gantt Grid Wrapper */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            borderRadius: '16px',
            bgcolor: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.025)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
            '&::-webkit-scrollbar-track': { background: '#f8fafc', borderRadius: '10px' },
            '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '10px', '&:hover': { background: '#94a3b8' } },
          }}
        >
          <Box sx={{ width: '100%', minWidth: totalWidth, position: 'relative' }}>
            {/* Header de meses */}
            <Box sx={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, bgcolor: '#ffffff', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', width: '100%' }}>
              {/* Columna vehículo header */}
              <Box sx={{
                width: COL_VEHICLE, flexShrink: 0,
                position: 'sticky', left: 0, zIndex: 25, bgcolor: '#f8fafc',
                borderRight: '1px solid rgba(226, 232, 240, 0.6)',
                borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                display: 'flex', alignItems: 'center', px: 2.5,
                height: HEADER_H,
              }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  VEHÍCULO
                </Typography>
              </Box>

              {/* Encabezados de días */}
              <Box sx={{ display: 'flex', flexGrow: 1, width: `calc(100% - ${COL_VEHICLE}px)` }}>
                {mesesVisibles.map(({ year: vy, month: vm, days }) => {
                  const monthDaysFraction = days.length / totalDias;
                  return (
                    <Box key={`${vy}-${vm}`} sx={{ flexGrow: monthDaysFraction, flexShrink: 0, width: `${monthDaysFraction * 100}%`, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ height: 26, display: 'flex', alignItems: 'center', px: 1.5, borderBottom: '1px solid rgba(226, 232, 240, 0.6)', borderLeft: '1px solid rgba(226, 232, 240, 0.6)', bgcolor: '#f8fafc' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.7rem', letterSpacing: '0.02em' }}>
                          {MESES[vm - 1].toUpperCase()} {vy}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', height: HEADER_H - 26, width: '100%' }}>
                        {days.map(day => {
                          const isWE = isWeekend(vy, vm, day);
                          const isHoy = vy === new Date().getFullYear() && vm === new Date().getMonth() + 1 && day === new Date().getDate();
                          const dSem = diaSemana(vy, vm, day);
                          const letterColor = dSem === 0 ? '#ef4444' : dSem === 6 ? '#64748b' : '#94a3b8';
                          const numColor = isHoy ? '#ffffff' : isWE ? '#64748b' : '#344767';
                          const numWeight = isHoy ? 700 : isWE ? 600 : 500;
                          return (
                            <Box key={day} sx={{ flex: 1, minWidth: DAY_W, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', py: 1, borderLeft: '1px solid rgba(226, 232, 240, 0.4)', bgcolor: isWE ? 'rgba(248, 250, 252, 0.65)' : 'transparent' }}>
                              <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600, color: letterColor, lineHeight: 1, fontFamily: '"Outfit", "Inter", sans-serif' }}>
                                {DIAS_SEMANA[dSem]}
                              </Typography>
                              <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...(isHoy ? { background: 'linear-gradient(195deg, #49a3f1 0%, #1A73E8 100%)', boxShadow: '0 2px 6px rgba(26,115,232,0.4)' } : {}) }}>
                                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: numWeight, color: numColor, lineHeight: 1, fontFamily: '"Outfit", "Inter", sans-serif' }}>
                                  {day}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Filas del Gantt */}
            {ganttRows.map((row) => {
              if (row.kind === 'divider') {
                return (
                  <Box key={`divider-${row.nombre}`} sx={{ display: 'flex', height: 28, borderBottom: '1px solid rgba(226, 232, 240, 0.6)', position: 'relative' }}>
                    <Box sx={{ width: COL_VEHICLE, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, bgcolor: '#eef2ff', borderRight: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', alignItems: 'center', px: 2 }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {row.nombre}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, bgcolor: '#f5f7ff' }} />
                  </Box>
                );
              }

              const v = row.vehiculo;
              const vReservas = reservasPorVehiculo[v.id] ?? [];
              return (
                <Box key={v.id} sx={{ display: 'flex', height: ROW_H, borderBottom: '1px solid rgba(226, 232, 240, 0.4)', position: 'relative', '&:hover': { bgcolor: 'rgba(79,70,229,0.015)' } }}>
                  {/* Columna vehículo (sticky) */}
                  <Box sx={{ width: COL_VEHICLE, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, bgcolor: '#ffffff', borderRight: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', alignItems: 'center', px: 2, gap: 1.5, transition: 'background-color 0.2s', '&:hover': { bgcolor: '#f8fafc' } }}>
                    <Avatar variant="rounded" src={v.foto_url ?? undefined} sx={{ width: 34, height: 30, borderRadius: '6px', bgcolor: '#e0e7ff', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                      <DirectionsCarOutlined sx={{ fontSize: 18, color: '#4f46e5' }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', display: 'block', lineHeight: 1.2, fontSize: '0.75rem' }}>
                        {v.patente}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block', fontWeight: 500 }} noWrap>
                        {v.modelo}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Celdas de días (fondo) */}
                  <Box sx={{ display: 'flex', flexGrow: 1, width: `calc(100% - ${COL_VEHICLE}px)`, position: 'relative' }}>
                    {mesesVisibles.map(({ year: vy, month: vm, days }) =>
                      days.map(day => {
                        const isWE = isWeekend(vy, vm, day);
                        const isHoy = vy === new Date().getFullYear() && vm === new Date().getMonth() + 1 && day === new Date().getDate();
                        return (
                          <Box key={`${vy}-${vm}-${day}`} sx={{ flex: 1, minWidth: DAY_W, height: '100%', borderLeft: '1px solid rgba(226, 232, 240, 0.4)', bgcolor: isHoy ? 'rgba(79,70,229,0.03)' : isWE ? 'rgba(248, 250, 252, 0.35)' : 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(79,70,229,0.05)' } }} />
                        );
                      })
                    )}

                    {/* Bloques de reservas */}
                    {vReservas.map(r => {
                      const color = ESTADO_COLOR[r.estado] ?? { bg: '#cbd5e1', text: '#475569' };
                      return mesesVisibles.map((_, idx) => {
                        const bloque = calcBloque(r, idx);
                        if (!bloque || bloque.widthPct < 0.1) return null;
                        return (
                          <Tooltip
                            key={`${r.id}-${idx}`}
                            title={
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>#{r.id_corto} — {r.cliente.nombre} {r.cliente.apellido}</Typography>
                                <Typography variant="caption">{new Date(r.fecha_entrega).toLocaleDateString('es-AR')} → {new Date(r.fecha_devolucion).toLocaleDateString('es-AR')}</Typography>
                              </Box>
                            }
                            arrow
                          >
                            <Box
                              onClick={() => setSelectedReserva(r)}
                              sx={{
                                position: 'absolute',
                                left: `calc(${bloque.leftPct}% + 3px)`,
                                width: `calc(${bloque.widthPct}% - 6px)`,
                                top: 9,
                                height: ROW_H - 18,
                                borderRadius: '8px',
                                bgcolor: color.bg,
                                color: color.text,
                                cursor: 'pointer',
                                zIndex: 5,
                                display: 'flex',
                                alignItems: 'center',
                                px: 1.5,
                                overflow: 'hidden',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08), inset 0 -1px 0 rgba(0,0,0,0.1)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': { filter: 'brightness(0.95)', boxShadow: '0 3px 8px rgba(0,0,0,0.12)', transform: 'scaleY(1.02) scaleX(1.005)' },
                              }}
                            >
                              {bloque.widthPct > 2 && (
                                <Typography noWrap sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'inherit', lineHeight: 1, letterSpacing: '0.01em' }}>
                                  {r.cliente.apellido}
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                        );
                      });
                    })}
                  </Box>
                </Box>
              );
            })}

            {ganttRows.length === 0 && (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <DirectionsCarOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                <Typography color="text.secondary">
                  {sucursalId || categoriaId ? 'Sin vehículos para los filtros seleccionados' : 'Sin vehículos en flota'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ReservaDrawer */}
      {selectedReserva && (
        <ReservaDrawer
          reserva={selectedReserva}
          onClose={() => setSelectedReserva(null)}
          onUpdate={(updated) => {
            setReservas(prev => prev.map(r => r.id === updated.id ? updated as ReservaConRelaciones : r));
            setSelectedReserva(updated as ReservaConRelaciones);
          }}
        />
      )}
    </Box>
  );
}

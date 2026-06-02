import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';

type VehiculoRow = {
  id: string; patente: string; marca: string; modelo: string;
  anio: number; color: string | null; foto_url: string | null;
  km_actual: number; categoria_id: string;
};
type CategoriaRow = { id: string; nombre: string; descripcion: string | null };
type TarifaRow = { categoria_id: string; precio_por_dia: number };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

  if (!desde || !hasta) {
    return NextResponse.json({ error: 'Se requieren los parámetros desde y hasta' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const [conflictRes, bloqueosRes, vehiculosRes, categoriasRes, tenantRes] = await Promise.all([
      supabase
        .from('reservas')
        .select('vehiculo_id')
        .in('estado', ['confirmada', 'en_curso', 'pendiente'])
        .not('vehiculo_id', 'is', null)
        .lt('fecha_entrega', hasta)
        .gt('fecha_devolucion', desde),
      supabase
        .from('bloqueos_vehiculo')
        .select('vehiculo_id')
        .eq('tenant_id', TENANT_ID)
        .lt('fecha_inicio', hasta)
        .gt('fecha_fin', desde),
      supabase
        .from('vehiculos')
        .select('id, patente, marca, modelo, anio, color, foto_url, km_actual, categoria_id')
        .eq('tenant_id', TENANT_ID)
        .not('estado', 'in', '("taller","bloqueado")'),
      supabase
        .from('categorias')
        .select('id, nombre, descripcion')
        .eq('tenant_id', TENANT_ID)
        .order('nombre'),
      supabase
        .from('tenants')
        .select('descuento_online_pct, nombre, logo_url')
        .eq('id', TENANT_ID)
        .single(),
    ]);

    type ConflictRow = { vehiculo_id: string };
    const conflictIds = new Set<string>([
      ...((conflictRes.data ?? []) as unknown as ConflictRow[]).map(r => r.vehiculo_id).filter(Boolean),
      ...((bloqueosRes.data ?? []) as unknown as ConflictRow[]).map(b => b.vehiculo_id).filter(Boolean),
    ]);

    const vehiculos = (vehiculosRes.data ?? []) as unknown as VehiculoRow[];
    const categorias = (categoriasRes.data ?? []) as unknown as CategoriaRow[];
    const availableVehiculos = vehiculos.filter(v => !conflictIds.has(v.id));

    // Find active temporada for start date
    const { data: temporadasData } = await supabase
      .from('temporadas')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .lte('fecha_inicio', desde)
      .gte('fecha_fin', desde)
      .limit(1);

    const temporadaId = (temporadasData?.[0] as { id: string } | undefined)?.id ?? null;

    let tarifas: TarifaRow[] = [];
    if (temporadaId) {
      const { data: tarifaData } = await supabase
        .from('tarifas')
        .select('categoria_id, precio_por_dia')
        .eq('tenant_id', TENANT_ID)
        .eq('temporada_id', temporadaId);
      tarifas = (tarifaData ?? []) as unknown as TarifaRow[];
    }

    const dias = Math.max(1, Math.ceil(
      (new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000
    ));

    // Group available vehicles by category
    const vehiculosByCategoria = new Map<string, VehiculoRow[]>();
    for (const v of availableVehiculos) {
      if (!v.categoria_id) continue;
      const arr = vehiculosByCategoria.get(v.categoria_id) ?? [];
      arr.push(v);
      vehiculosByCategoria.set(v.categoria_id, arr);
    }

    const resultado = categorias
      .filter(cat => (vehiculosByCategoria.get(cat.id)?.length ?? 0) > 0)
      .map(cat => {
        const tarifa = tarifas.find(t => t.categoria_id === cat.id);
        const precioPorDia = tarifa?.precio_por_dia ?? 0;
        return {
          categoria: cat,
          vehiculos: vehiculosByCategoria.get(cat.id) ?? [],
          precio_por_dia: precioPorDia,
          precio_total: precioPorDia * dias,
          dias,
        };
      });

    const tenant = tenantRes.data as {
      descuento_online_pct: number; nombre: string; logo_url: string | null
    } | null;

    return NextResponse.json({
      data: resultado,
      descuento_online_pct: tenant?.descuento_online_pct ?? 20,
    });
  } catch (err) {
    console.error('disponibilidad error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

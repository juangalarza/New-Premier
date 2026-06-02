export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          nombre: string
          logo_url: string | null
          descuento_online_pct: number
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          logo_url?: string | null
          descuento_online_pct?: number
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          logo_url?: string | null
          descuento_online_pct?: number
          created_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          tenant_id: string
          nombre: string
          apellido: string
          rol: 'admin' | 'operador'
          created_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          nombre: string
          apellido: string
          rol: 'admin' | 'operador'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nombre?: string
          apellido?: string
          rol?: 'admin' | 'operador'
          created_at?: string
        }
      }
      categorias: {
        Row: {
          id: string
          tenant_id: string
          nombre: string
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nombre: string
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nombre?: string
          descripcion?: string | null
          created_at?: string
        }
      }
      vehiculos: {
        Row: {
          id: string
          tenant_id: string
          patente: string
          marca: string
          modelo: string
          categoria_id: string
          color: string | null
          anio: number
          km_actual: number
          combustible_actual: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno'
          estado: 'disponible' | 'alquilado' | 'taller' | 'bloqueado'
          es_propio: boolean
          foto_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          patente: string
          marca: string
          modelo: string
          categoria_id: string
          color?: string | null
          anio: number
          km_actual?: number
          combustible_actual?: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno'
          estado?: 'disponible' | 'alquilado' | 'taller' | 'bloqueado'
          es_propio?: boolean
          foto_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          patente?: string
          marca?: string
          modelo?: string
          categoria_id?: string
          color?: string | null
          anio?: number
          km_actual?: number
          combustible_actual?: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno'
          estado?: 'disponible' | 'alquilado' | 'taller' | 'bloqueado'
          es_propio?: boolean
          foto_url?: string | null
          created_at?: string
        }
      }
      temporadas: {
        Row: {
          id: string
          tenant_id: string
          nombre: 'baja' | 'media' | 'alta'
          fecha_inicio: string
          fecha_fin: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nombre: 'baja' | 'media' | 'alta'
          fecha_inicio: string
          fecha_fin: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nombre?: 'baja' | 'media' | 'alta'
          fecha_inicio?: string
          fecha_fin?: string
          created_at?: string
        }
      }
      tarifas: {
        Row: {
          id: string
          tenant_id: string
          categoria_id: string
          temporada_id: string
          precio_por_dia: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          categoria_id: string
          temporada_id: string
          precio_por_dia: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          categoria_id?: string
          temporada_id?: string
          precio_por_dia?: number
          created_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          tenant_id: string
          nombre: string
          apellido: string
          email: string
          telefono: string | null
          dni_pasaporte: string
          licencia_conducir: string | null
          ciudad: string | null
          pais: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nombre: string
          apellido: string
          email: string
          telefono?: string | null
          dni_pasaporte: string
          licencia_conducir?: string | null
          ciudad?: string | null
          pais?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nombre?: string
          apellido?: string
          email?: string
          telefono?: string | null
          dni_pasaporte?: string
          licencia_conducir?: string | null
          ciudad?: string | null
          pais?: string | null
          created_at?: string
        }
      }
      reservas: {
        Row: {
          id: string
          tenant_id: string
          numero: string
          id_corto: string
          vehiculo_id: string | null
          cliente_id: string
          fecha_entrega: string
          fecha_devolucion: string
          lugar_entrega: string
          lugar_devolucion: string
          numero_vuelo: string | null
          codigo_descuento: string | null
          precio_base: number
          descuento_aplicado: number
          precio_coberturas: number
          precio_adicionales: number
          precio_total: number
          total_pagado: number
          estado: 'preventa' | 'pendiente' | 'confirmada' | 'en_curso' | 'devuelta' | 'cancelada'
          km_entrega: number | null
          km_devolucion: number | null
          combustible_entrega: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno' | null
          combustible_devolucion: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno' | null
          factura_cae: string | null
          factura_vto: string | null
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          numero: string
          id_corto: string
          vehiculo_id?: string | null
          cliente_id: string
          fecha_entrega: string
          fecha_devolucion: string
          lugar_entrega: string
          lugar_devolucion: string
          numero_vuelo?: string | null
          codigo_descuento?: string | null
          precio_base: number
          descuento_aplicado?: number
          precio_coberturas?: number
          precio_adicionales?: number
          precio_total: number
          total_pagado?: number
          estado?: 'preventa' | 'pendiente' | 'confirmada' | 'en_curso' | 'devuelta' | 'cancelada'
          km_entrega?: number | null
          km_devolucion?: number | null
          combustible_entrega?: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno' | null
          combustible_devolucion?: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno' | null
          factura_cae?: string | null
          factura_vto?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          numero?: string
          id_corto?: string
          vehiculo_id?: string | null
          cliente_id?: string
          fecha_entrega?: string
          fecha_devolucion?: string
          lugar_entrega?: string
          lugar_devolucion?: string
          numero_vuelo?: string | null
          codigo_descuento?: string | null
          precio_base?: number
          descuento_aplicado?: number
          precio_coberturas?: number
          precio_adicionales?: number
          precio_total?: number
          total_pagado?: number
          estado?: 'preventa' | 'pendiente' | 'confirmada' | 'en_curso' | 'devuelta' | 'cancelada'
          km_entrega?: number | null
          km_devolucion?: number | null
          combustible_entrega?: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno' | null
          combustible_devolucion?: '1/8' | '1/4' | '1/2' | '3/4' | 'lleno' | null
          factura_cae?: string | null
          factura_vto?: string | null
          observaciones?: string | null
          created_at?: string
        }
      }
      pagos: {
        Row: {
          id: string
          tenant_id: string
          reserva_id: string
          monto: number
          metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'mercadopago'
          referencia: string | null
          mp_payment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          reserva_id: string
          monto: number
          metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'mercadopago'
          referencia?: string | null
          mp_payment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          reserva_id?: string
          monto?: number
          metodo?: 'efectivo' | 'transferencia' | 'tarjeta' | 'mercadopago'
          referencia?: string | null
          mp_payment_id?: string | null
          created_at?: string
        }
      }
      coberturas: {
        Row: {
          id: string
          tenant_id: string
          nombre: string
          descripcion: string | null
          precio_por_dia: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nombre: string
          descripcion?: string | null
          precio_por_dia: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nombre?: string
          descripcion?: string | null
          precio_por_dia?: number
          created_at?: string
        }
      }
      adicionales: {
        Row: {
          id: string
          tenant_id: string
          nombre: string
          descripcion: string | null
          precio_por_dia: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nombre: string
          descripcion?: string | null
          precio_por_dia: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nombre?: string
          descripcion?: string | null
          precio_por_dia?: number
          created_at?: string
        }
      }
      bloqueos_vehiculo: {
        Row: {
          id: string
          tenant_id: string
          vehiculo_id: string
          fecha_desde: string
          fecha_hasta: string
          motivo: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          vehiculo_id: string
          fecha_desde: string
          fecha_hasta: string
          motivo: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          vehiculo_id?: string
          fecha_desde?: string
          fecha_hasta?: string
          motivo?: string
          created_at?: string
        }
      }
      descuentos: {
        Row: {
          id: string
          tenant_id: string
          codigo: string
          descuento_pct: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          codigo: string
          descuento_pct: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          codigo?: string
          descuento_pct?: number
          activo?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in Skinner]: never
    }
    Functions: {
      [_ in Skinner]: never
    }
    Enums: {
      [_ in Skinner]: never
    }
  }
}

type Skinner = never

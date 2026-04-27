export type CreateOrderItem = {
  menu_item_id: string;
  quantity: number;
  selected_option_ids: string[];
};

export type CreateOrderInput = {
  restaurant_id: string;
  address_id: string | null;
  payment_method: string;
  guest_phone?: string | null;
  guest_lat?: number | null;
  guest_lng?: number | null;
  guest_device_id?: string | null;
  request_id?: string | null;
  promo_code?: string | null;
  items: CreateOrderItem[];
};

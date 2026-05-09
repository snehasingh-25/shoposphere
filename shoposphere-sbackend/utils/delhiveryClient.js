import { getDelhiveryConfig, isDelhiveryConfigured } from "./delhiveryConfig.js";

function buildHeaders(config, extra = {}) {
  return {
    Authorization: `Token ${config.apiToken}`,
    Accept: "application/json",
    ...extra,
  };
}

async function request(path, options = {}) {
  const config = getDelhiveryConfig();
  if (!isDelhiveryConfigured(config)) {
    throw new Error("Delhivery configuration is incomplete");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...buildHeaders(config),
        ...(options.headers || {}),
      },
    });

    const raw = await response.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }

    if (!response.ok) {
      const error = new Error(`Delhivery API failed (${response.status})`);
      error.status = response.status;
      error.response = parsed;
      throw error;
    }

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

function buildShipmentPayload(order) {
  const config = getDelhiveryConfig();
  const codAmount = order.paymentMethod === "cod" ? Number(order.total || 0) : 0;
  return {
    shipments: [
      {
        order: String(order.id),
        waybill: order.delhiveryWaybill || "",
        payment_mode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
        total_amount: Number(order.total || 0),
        cod_amount: codAmount,
        name: order.customer,
        add: order.address,
        city: order.addressCity,
        state: order.addressState,
        pin: order.addressPincode,
        phone: order.phone,
        email: order.email || undefined,
        products_desc: "Shoposphere order",
        order_date: new Date(order.createdAt).toISOString().slice(0, 10),
        weight: 0.5,
      },
    ],
    pickup_location: {
      name: config.pickupLocationName,
    },
  };
}

export async function createShipment(order) {
  const payload = buildShipmentPayload(order);
  const formBody = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
  const result = await request("/api/cmu/create.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  // Delhivery returns { success: false, error: true, rmk: "..." } on failure
  if (result?.success === false || result?.error === true) {
    const msg = result.rmk || "Unknown Delhivery error";
    console.error("Delhivery createShipment failed:", JSON.stringify(result));
    const err = new Error(`Delhivery shipment creation failed: ${msg}`);
    err.delhiveryResponse = result;
    throw err;
  }

  const packages = result?.packages || [];
  if (packages.length === 0) {
    console.error("Delhivery returned empty packages:", JSON.stringify(result));
    const err = new Error("Delhivery returned no packages — check client name and pickup location");
    err.delhiveryResponse = result;
    throw err;
  }

  return result;
}

export async function trackShipmentByWaybill(waybill) {
  const query = new URLSearchParams({ waybill: String(waybill) });
  return request(`/api/v1/packages/json/?${query.toString()}`);
}

export async function checkPincodeServiceability(pincode) {
  const query = new URLSearchParams({ filter_codes: String(pincode) });
  const data = await request(`/c/api/pin-codes/json/?${query.toString()}`);
  // Delhivery returns { delivery_codes: [...] } — empty array = not serviceable
  const codes = data?.delivery_codes || [];
  if (codes.length === 0) return { serviceable: false, prepaid: false, cod: false };
  const info = codes[0]?.postal_code || {};
  return {
    serviceable: true,
    prepaid: info.pre_paid === "Y",
    cod: info.cod === "Y",
    district: info.district || null,
    stateCode: info.state_code || null,
  };
}

export function extractShipmentMeta(createShipmentResponse) {
  if (!createShipmentResponse || typeof createShipmentResponse !== "object") {
    return { delhiveryOrderId: null, delhiveryWaybill: null, delhiveryTrackingId: null, delhiveryLabelUrl: null };
  }

  const packages = createShipmentResponse.packages || createShipmentResponse.shipments || [];
  const first = Array.isArray(packages) && packages.length > 0 ? packages[0] : {};

  return {
    delhiveryOrderId: first.refnum || first.order || null,
    delhiveryWaybill: first.waybill || createShipmentResponse.waybill || null,
    delhiveryTrackingId: first.awb || first.waybill || null,
    delhiveryLabelUrl: first.label || first.label_url || null,
  };
}

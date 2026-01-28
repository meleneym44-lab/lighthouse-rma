// UPS Shipping Edge Function
// Sandbox URL for testing - switch to production when ready
// Testing: https://wwwcie.ups.com
// Production: https://onlinetools.ups.com

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UPS API Configuration
const UPS_BASE_URL = Deno.env.get('UPS_BASE_URL') || 'https://wwwcie.ups.com'
const UPS_CLIENT_ID = Deno.env.get('UPS_CLIENT_ID')
const UPS_CLIENT_SECRET = Deno.env.get('UPS_CLIENT_SECRET')
const UPS_ACCOUNT_NUMBER = Deno.env.get('UPS_ACCOUNT_NUMBER')

// Lighthouse France address - MUST MATCH UPS ACCOUNT EXACTLY
const LIGHTHOUSE_ADDRESS = {
  name: "Lighthouse France",
  company: "Lighthouse France",
  attentionName: "Service Clients",
  phone: "0143772807",
  addressLine1: "16 rue Paul Sejourne",
  city: "CRETEIL",
  postalCode: "94000",
  countryCode: "FR"
}

// Get OAuth token from UPS
async function getUPSToken(): Promise<string> {
  const credentials = btoa(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`)
  
  const response = await fetch(`${UPS_BASE_URL}/security/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('UPS Auth Error:', error)
    throw new Error(`UPS Authentication failed: ${response.status}`)
  }
  
  const data = await response.json()
  return data.access_token
}

// Create a shipment and get label
async function createShipment(token: string, shipmentData: any) {
  const { shipTo, shipFrom, packages, serviceCode, description, isReturn } = shipmentData
  
  // For returns: customer ships TO Lighthouse
  // For outbound: Lighthouse ships TO customer
  const shipperAddress = isReturn ? shipFrom : LIGHTHOUSE_ADDRESS
  const shipToAddress = isReturn ? LIGHTHOUSE_ADDRESS : shipTo
  const shipFromAddress = isReturn ? shipFrom : LIGHTHOUSE_ADDRESS
  
  // Helper functions to get proper names for UPS
  const getCompanyName = (addr: any) => addr.company || addr.attentionName || addr.name || "Company"
  const getPersonName = (addr: any) => addr.attentionName || addr.name || addr.company || "Recipient"
  const getPhone = (addr: any) => {
    const phone = addr.phone || "0100000000"
    return phone.replace(/\s/g, '').replace(/[^0-9]/g, '')
  }
  
  const requestBody = {
    ShipmentRequest: {
      Request: {
        RequestOption: "nonvalidate",
        TransactionReference: {
          CustomerContext: description || "RMA Shipment"
        }
      },
      Shipment: {
        Description: description || "Calibration Equipment",
        Shipper: {
          Name: getCompanyName(shipperAddress),
          AttentionName: getPersonName(shipperAddress),
          Phone: { Number: getPhone(shipperAddress) },
          ShipperNumber: UPS_ACCOUNT_NUMBER,
          Address: {
            AddressLine: [shipperAddress.addressLine1, shipperAddress.addressLine2].filter(Boolean),
            City: shipperAddress.city,
            PostalCode: shipperAddress.postalCode,
            CountryCode: shipperAddress.countryCode || "FR"
          }
        },
        ShipTo: {
          Name: getCompanyName(shipToAddress),
          AttentionName: getPersonName(shipToAddress),
          Phone: { Number: getPhone(shipToAddress) },
          Address: {
            AddressLine: [shipToAddress.addressLine1, shipToAddress.addressLine2].filter(Boolean),
            City: shipToAddress.city,
            PostalCode: shipToAddress.postalCode,
            CountryCode: shipToAddress.countryCode || "FR"
          }
        },
        ShipFrom: {
          Name: getCompanyName(shipFromAddress),
          AttentionName: getPersonName(shipFromAddress),
          Phone: { Number: getPhone(shipFromAddress) },
          Address: {
            AddressLine: [shipFromAddress.addressLine1, shipFromAddress.addressLine2].filter(Boolean),
            City: shipFromAddress.city,
            PostalCode: shipFromAddress.postalCode,
            CountryCode: shipFromAddress.countryCode || "FR"
          }
        },
        PaymentInformation: {
          ShipmentCharge: [{
            Type: "01",
            BillShipper: {
              AccountNumber: UPS_ACCOUNT_NUMBER
            }
          }]
        },
        Service: {
          Code: serviceCode || "11",
          Description: getServiceDescription(serviceCode || "11")
        },
        Package: packages.map((pkg: any, index: number) => ({
          Description: pkg.description || `Package ${index + 1}`,
          Packaging: {
            Code: "02",
            Description: "Package"
          },
          Dimensions: {
            UnitOfMeasurement: { Code: "CM" },
            Length: String(pkg.length || 30),
            Width: String(pkg.width || 30),
            Height: String(pkg.height || 30)
          },
          PackageWeight: {
            UnitOfMeasurement: { Code: "KGS" },
            Weight: String(pkg.weight || 5)
          }
        })),
        ...(isReturn && {
          ReturnService: {
            Code: "9"
          }
        })
      },
      LabelSpecification: {
        LabelImageFormat: {
          Code: "PDF"
        },
        LabelStockSize: {
          Height: "6",
          Width: "4"
        }
      }
    }
  }
  
  console.log('UPS Shipment Request:', JSON.stringify(requestBody, null, 2))
  
  const response = await fetch(`${UPS_BASE_URL}/api/shipments/v1/ship`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'transId': `RMA-${Date.now()}`,
      'transactionSrc': 'Lighthouse-RMA'
    },
    body: JSON.stringify(requestBody)
  })
  
  const responseData = await response.json()
  
  if (!response.ok) {
    console.error('UPS Shipment Error:', JSON.stringify(responseData, null, 2))
    throw new Error(responseData.response?.errors?.[0]?.message || 'Shipment creation failed')
  }
  
  return responseData
}

// Get shipping rates
async function getRates(token: string, rateData: any) {
  const { shipTo, packages } = rateData
  
  const requestBody = {
    RateRequest: {
      Request: {
        RequestOption: "Shop"
      },
      Shipment: {
        Shipper: {
          Name: LIGHTHOUSE_ADDRESS.company,
          ShipperNumber: UPS_ACCOUNT_NUMBER,
          Address: {
            AddressLine: [LIGHTHOUSE_ADDRESS.addressLine1],
            City: LIGHTHOUSE_ADDRESS.city,
            PostalCode: LIGHTHOUSE_ADDRESS.postalCode,
            CountryCode: LIGHTHOUSE_ADDRESS.countryCode
          }
        },
        ShipTo: {
          Name: shipTo.company || shipTo.name || "Customer",
          Address: {
            AddressLine: [shipTo.addressLine1, shipTo.addressLine2].filter(Boolean),
            City: shipTo.city,
            PostalCode: shipTo.postalCode,
            CountryCode: shipTo.countryCode || "FR"
          }
        },
        ShipFrom: {
          Name: LIGHTHOUSE_ADDRESS.company,
          Address: {
            AddressLine: [LIGHTHOUSE_ADDRESS.addressLine1],
            City: LIGHTHOUSE_ADDRESS.city,
            PostalCode: LIGHTHOUSE_ADDRESS.postalCode,
            CountryCode: LIGHTHOUSE_ADDRESS.countryCode
          }
        },
        Package: packages.map((pkg: any) => ({
          PackagingType: { Code: "02" },
          Dimensions: {
            UnitOfMeasurement: { Code: "CM" },
            Length: String(pkg.length || 30),
            Width: String(pkg.width || 30),
            Height: String(pkg.height || 30)
          },
          PackageWeight: {
            UnitOfMeasurement: { Code: "KGS" },
            Weight: String(pkg.weight || 5)
          }
        }))
      }
    }
  }
  
  const response = await fetch(`${UPS_BASE_URL}/api/rating/v1/Shop`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'transId': `RATE-${Date.now()}`,
      'transactionSrc': 'Lighthouse-RMA'
    },
    body: JSON.stringify(requestBody)
  })
  
  const responseData = await response.json()
  
  if (!response.ok) {
    console.error('UPS Rating Error:', JSON.stringify(responseData, null, 2))
    throw new Error(responseData.response?.errors?.[0]?.message || 'Rating request failed')
  }
  
  return responseData
}

// Track a shipment
async function trackShipment(token: string, trackingNumber: string) {
  const response = await fetch(
    `${UPS_BASE_URL}/api/track/v1/details/${trackingNumber}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'transId': `TRACK-${Date.now()}`,
      'transactionSrc': 'Lighthouse-RMA'
    }
  })
  
  const responseData = await response.json()
  
  if (!response.ok) {
    console.error('UPS Tracking Error:', JSON.stringify(responseData, null, 2))
    throw new Error(responseData.response?.errors?.[0]?.message || 'Tracking request failed')
  }
  
  return responseData
}

function getServiceDescription(code: string): string {
  const services: Record<string, string> = {
    "01": "UPS Next Day Air",
    "02": "UPS 2nd Day Air",
    "03": "UPS Ground",
    "07": "UPS Express",
    "08": "UPS Expedited",
    "11": "UPS Standard",
    "12": "UPS 3 Day Select",
    "13": "UPS Next Day Air Saver",
    "14": "UPS Next Day Air Early",
    "54": "UPS Express Plus",
    "59": "UPS 2nd Day Air A.M.",
    "65": "UPS Express Saver",
  }
  return services[code] || "UPS Service"
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const { action, ...data } = await req.json()
    
    if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET || !UPS_ACCOUNT_NUMBER) {
      throw new Error('UPS credentials not configured')
    }
    
    const token = await getUPSToken()
    
    let result
    
    switch (action) {
      case 'create_shipment':
        result = await createShipment(token, data)
        const shipmentResult = result.ShipmentResponse?.ShipmentResults
        // PackageResults can be array or single object
        const packageResults = shipmentResult?.PackageResults
        const packagesArray = Array.isArray(packageResults) ? packageResults : [packageResults].filter(Boolean)
        return new Response(JSON.stringify({
          success: true,
          trackingNumber: shipmentResult?.ShipmentIdentificationNumber,
          packages: packagesArray.map((pkg: any) => ({
            trackingNumber: pkg.TrackingNumber,
            labelData: pkg.ShippingLabel?.GraphicImage,
            labelFormat: 'PDF'
          })),
          totalCharges: shipmentResult?.ShipmentCharges?.TotalCharges,
          billingWeight: shipmentResult?.BillingWeight
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      case 'get_rates':
        result = await getRates(token, data)
        const ratedShipments = result.RateResponse?.RatedShipment || []
        return new Response(JSON.stringify({
          success: true,
          rates: Array.isArray(ratedShipments) ? ratedShipments.map((rate: any) => ({
            serviceCode: rate.Service?.Code,
            serviceName: getServiceDescription(rate.Service?.Code),
            totalPrice: rate.TotalCharges?.MonetaryValue,
            currency: rate.TotalCharges?.CurrencyCode,
            estimatedDays: rate.GuaranteedDelivery?.BusinessDaysInTransit
          })) : []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      case 'track':
        result = await trackShipment(token, data.trackingNumber)
        return new Response(JSON.stringify({
          success: true,
          tracking: result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      case 'test_connection':
        return new Response(JSON.stringify({
          success: true,
          message: 'UPS API connection successful',
          environment: UPS_BASE_URL.includes('wwwcie') ? 'SANDBOX' : 'PRODUCTION',
          accountNumber: UPS_ACCOUNT_NUMBER
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
  } catch (error) {
    console.error('UPS Function Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

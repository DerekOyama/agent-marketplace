import { NextRequest } from "next/server";
import { ApiResponse } from "../../../../../../lib/api-utils";
import { PayoutManager } from "../../../../../../lib/payout-manager";

/**
 * POST /api/admin/payouts/[id]/process - Process a payout (admin only)
 */
export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: payoutId } = await params;
    const body = await req.json();
    const { bankAccountId } = body;

    // Process the payout
    const result = await PayoutManager.processPayout(payoutId, bankAccountId);

    if (!result.success) {
      return ApiResponse.error('payout_failed', result.error);
    }

    return ApiResponse.success({
      payoutId,
      stripeTransferId: result.stripeTransferId,
      stripePayoutId: result.stripePayoutId,
      message: 'Payout processed successfully'
    });

  } catch (error) {
    console.error('Error processing payout:', error);
    return ApiResponse.error('processing_failed', 'Failed to process payout');
  }
};

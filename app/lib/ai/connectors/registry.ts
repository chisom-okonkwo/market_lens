import { AIPlatform } from "@/lib/aiResponse";
import { type AIConnector } from "@/lib/ai/connectors/types";

export class AIConnectorRegistry {
  private readonly connectorsByPlatform: Map<AIPlatform, AIConnector>;

  public constructor(connectors: AIConnector[] = []) {
    this.connectorsByPlatform = new Map(
      connectors.map((connector) => [connector.platform, connector] as const),
    );
  }

  public get(platform: AIPlatform): AIConnector | undefined {
    return this.connectorsByPlatform.get(platform);
  }

  public getAll(): AIConnector[] {
    return [...this.connectorsByPlatform.values()];
  }
}

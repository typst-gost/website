import { source } from "@/lib/source";
import { findSiblings } from "fumadocs-core/page-tree";
import { Card, Cards } from "fumadocs-ui/components/card";
import * as LucideIcons from "lucide-react";

function getIconByName(name: string | undefined) {
  if (!name) return undefined;
  // @ts-expect-error - Динамические иконки
  const IconComponent = LucideIcons[name]; 
  return IconComponent ? <IconComponent />: undefined
} 

export function FurtherReading({ targetUrl }: { targetUrl: string }) {
  return (
    <Cards>
      {findSiblings(source.getPageTree(), targetUrl).map((peer) => {
        if (peer.type === 'separator') return null;
        
        const targetNode = peer.type === 'folder' ? peer.index : peer;
        if (!targetNode) return null;

        const page = source.getNodePage(targetNode);
        const iconName = page?.data.iconLocal;
        const icon = getIconByName(iconName) || peer.icon;

        return (
          <Card 
            key={targetNode.url} 
            title={targetNode.name} 
            href={targetNode.url} 
            icon={icon}
          >
            {targetNode.description}
          </Card>
        );
      })}
    </Cards>
  );
}

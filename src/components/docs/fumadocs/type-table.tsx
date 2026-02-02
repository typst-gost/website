'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { type ReactNode, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ParameterNode {
  name: string;
  description: ReactNode;
}

export interface TypeNode {
  /**
   * Additional description of the field
   */
  description?: ReactNode;

  /**
   * type signature (short)
   */
  type: ReactNode;

  /**
   * type signature (full)
   */
  typeDescription?: ReactNode;

  /**
   * Optional `href` for the type
   */
  typeDescriptionLink?: string;

  default?: ReactNode;

  required?: boolean;
  deprecated?: boolean;

  parameters?: ParameterNode[];

  returns?: ReactNode;
}

const keyVariants = cva('text-fd-primary font-mono text-xs', {
  variants: {
    deprecated: {
      true: 'line-through text-fd-primary/50',
    },
  },
});

const fieldVariants = cva('text-fd-muted-foreground not-prose pe-2');

export function TypeTable({ type }: { type: Record<string, TypeNode> }) {
  return (
    <div className="@container flex flex-col p-1 bg-fd-card text-fd-card-foreground rounded-2xl border my-6 text-sm overflow-hidden">
      {/* Шапка таблицы */}
      <div className="grid grid-cols-1 md:grid-cols-[25%_25%_1fr] items-center px-3 py-2 not-prose text-fd-muted-foreground border-b border-transparent">
        <p>Параметр</p>
        <p className="hidden md:block">Тип</p>
        <p className="hidden md:block">Описание</p>
      </div>
      
      <div className="flex flex-col gap-1">
        {Object.entries(type).map(([key, value]) => (
          <Item key={key} name={key} item={value} />
        ))}
      </div>
    </div>
  );
}

function Item({
  name,
  item: {
    parameters = [],
    description,
    required = false,
    deprecated,
    typeDescription,
    default: defaultValue,
    type,
    typeDescriptionLink,
    returns,
  },
}: {
  name: string;
  item: TypeNode;
}) {
  const [open, setOpen] = useState(false);

  const hasDetails = Boolean(
    typeDescription || 
    defaultValue || 
    parameters.length > 0 || 
    returns
  );

  const renderTypeColumn = () => {
    if (typeDescriptionLink) {
      return (
        <Link href={typeDescriptionLink} className="underline truncate">
          {type}
        </Link>
      );
    }
    return <span className="truncate">{type}</span>;
  };

  const content = (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-[25%_25%_1fr] items-center gap-y-1 w-full text-start px-3 py-2 transition-colors",
      hasDetails && "cursor-pointer"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <code
          className={cn(
            keyVariants({
              deprecated,
              className: 'bg-fd-primary/10 px-1.5 py-0.5 rounded-md border border-fd-primary/10',
            }),
          )}
        >
          {name}
          {!required && '?'}
        </code>
      </div>

      <div className="hidden md:block min-w-0 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2 text-fd-muted-foreground">
          {renderTypeColumn()}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 min-w-0 relative">
        <div className="text-fd-muted-foreground text-sm prose prose-no-margin line-clamp-2 md:line-clamp-1 leading-normal flex-1">
          {description}
        </div>
        
        {hasDetails && (
          <ChevronDown 
            className={cn(
              "size-4 text-fd-muted-foreground transition-transform shrink-0",
              open ? "rotate-180" : ""
            )} 
          />
        )}
      </div>
      
      <div className="md:hidden col-span-full mt-1 text-xs font-mono pl-1">
        <div className="flex flex-wrap items-center gap-2 text-fd-muted-foreground">
          {renderTypeColumn()}
        </div>
      </div>
    </div>
  );

  if (!hasDetails) {
    return (
      <div className="rounded-xl border border-transparent hover:bg-fd-accent/30 transition-colors">
        {content}
      </div>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'rounded-xl border transition-all',
        open
          ? 'shadow-sm bg-fd-background border-border'
          : 'border-transparent hover:bg-fd-accent/30',
      )}
    >
      <CollapsibleTrigger asChild>
        {content}
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="grid grid-cols-[1fr_3fr] gap-y-3 text-sm px-4 py-3 border-t bg-fd-card/50">
          {typeDescription && (
            <>
              <p className={cn(fieldVariants())}>Полный тип</p>
              <div className="font-mono text-xs p-2 rounded overflow-x-auto">
                {typeDescription}
              </div>
            </>
          )}

          {defaultValue && (
            <>
              <p className={cn(fieldVariants())}>По умолчанию</p>
              <code className="w-fit px-1.5 py-0.5 rounded border text-xs font-mono">
                {defaultValue}
              </code>
            </>
          )}

          {parameters.length > 0 && (
            <>
              <p className={cn(fieldVariants(), "self-start pt-1")}>Параметры</p>
              <div className="flex flex-col gap-2 rounded-lg border p-2 bg-fd-background">
                {parameters.map((param) => (
                  <div
                    key={param.name}
                    className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-sm"
                  >
                    <code className="text-xs text-fd-primary shrink-0">
                      {param.name}
                    </code>
                    <span className="hidden sm:inline text-fd-muted-foreground">-</span>
                    <div className="prose prose-sm prose-no-margin text-fd-muted-foreground">
                      {param.description}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {returns && (
            <>
              <p className={cn(fieldVariants())}>Возвращает</p>
              <div className="prose prose-sm prose-no-margin text-fd-muted-foreground">
                {returns}
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

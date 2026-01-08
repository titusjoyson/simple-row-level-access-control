import React from 'react';
import { Check, X, RefreshCw } from 'lucide-react';

const CapabilityToggle = ({ slug, overrideAction, isInherited, onUpdate, onReset }) => {

    // Determine the "Effective" state
    const isGranted = overrideAction === 'GRANT' || (!overrideAction && isInherited);
    const isRevoked = overrideAction === 'REVOKE' || (!overrideAction && !isInherited);

    // Determine visual style
    let containerClass = "border-gray-200 bg-gray-50";
    if (overrideAction === 'GRANT') containerClass = "border-green-300 bg-green-50";
    if (overrideAction === 'REVOKE') containerClass = "border-red-300 bg-red-50";

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${containerClass} transition-all`}>
            <div className="flex flex-col">
                <span className="font-mono text-sm text-gray-700">{slug}</span>
                <span className="text-xs text-gray-500 mt-0.5">
                    {overrideAction ? (
                        <span className={overrideAction === 'GRANT' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            Explicitly {overrideAction}ED
                        </span>
                    ) : (
                        isInherited ? <span className="text-indigo-600">Inherited from Role</span> : "Not available"
                    )}
                </span>
            </div>

            <div className="flex items-center space-x-1 bg-white rounded-md border border-gray-200 p-1 shadow-sm">

                {/* GRANT BUTTON */}
                <button
                    onClick={() => onUpdate('GRANT')}
                    className={`p-1.5 rounded hover:bg-green-100 transition-colors ${isGranted && ((overrideAction === 'GRANT') || isInherited && !overrideAction) ? 'text-green-600' : 'text-gray-300'}`}
                    title="Grant Access"
                >
                    <Check className="w-5 h-5" />
                </button>

                {/* INHERIT BUTTON (RESET) */}
                <button
                    onClick={onReset}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${!overrideAction ? 'text-blue-500 bg-blue-50' : 'text-gray-400'}`}
                    title="Inherit from Role"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>

                {/* REVOKE BUTTON */}
                <button
                    onClick={() => onUpdate('REVOKE')}
                    className={`p-1.5 rounded hover:bg-red-100 transition-colors ${overrideAction === 'REVOKE' ? 'text-red-600' : 'text-gray-300'}`}
                    title="Revoke Access"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default CapabilityToggle;
